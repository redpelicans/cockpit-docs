const _ = require('underscore')
    , mongodb = require('mongodb')
    , debug = require('debug')('main:init')
    , params = require('./params')
    , moment = require('moment')
    , href = require('href')
    , path = require('path')
    , mkdirp = require('mkdirp')
    , ProgressBar = require('progress')
    , fs = require('fs')
    , async = require('async');

function initHref(params) {
  return function init(callback) {
    href.connect(_.extend({verbose: false}, params), function(err) {
      debug('href is ready for your requests ...');
      callback(err, href);
    });
  }
}

function initDocs(params, callback) {
  var servers = params.servers
    , database = params.database
    , collections = params.collections;

  if (!servers) throw "missing 'servers' parameter";
  if (!database) throw "missing 'database' parameter";
  if (!collections) throw "missing 'collections' parameter";

  var mongodbServers = _.map(servers, function(server) {
    return mongodb.Server(server.host, server.port, server.options);
  });

  var replSet = new mongodb.ReplSet(mongodbServers);

  var db = mongodb.Db(database.name, replSet, database.options);

  db.open(function(err) {
    if (err) return callback(err);
    callback(null, db);

  });

}

var argv = require('yargs')
          .describe('path to extract documents')
          .require('path')
          .argv;

async.parallel({
    docs: initDocs.bind(null, params.docs)
  , href: initHref(params.href)
}, function(err, res){

  function loadFolders(data, cb){
    res.docs.collection('folders').find({}).toArray(function(err, folders){
      if(err) throw err;
      var hfolders = _.inject(folders, function(res, folder){res[folder._id] = folder; return res}, {});
      _.each(folders, function(folder){ if (folder.parentId) folder.parent = hfolders[folder.parentId] });
      data.folders = hfolders;
      debug("Loaded %d folders", folders.length);
      cb(null, data);
    })

  }

  function loadTypes(data, cb){
    res.docs.collection('types').find({}).toArray(function(err, types){
      if(err) throw err;
      var htypes = _.inject(types, function(res, folder){res[folder._id] = folder; return res}, {});
      _.each(types, function(folder){ if (folder.parentId) folder.parent = htypes[folder.parentId] });
      data.types = htypes;
      debug("Loaded %d types", types.length);
      cb(null, data);
    })

  }


  function loadAllDocs(data, cb){
    res.docs.collection('documents').find({}).toArray(function(err, docs){
      if(err) throw err;
      debug("Found %d documents", docs.length);
      data.docs = docs;
      cb(null, data);
    })
  }

  function loadCompanies(data, cb){
    var hcompanies = _.inject(data.docs, function(res, doc){res[doc.owner_id] = doc.owner_id; return res}, {});
    res.href.models.companies.findAll({hId: {$in: _.values(hcompanies)}}, function(err, companies){
      if(err) throw err;
      var hcompanies = _.inject(companies, function(res, company){res[company.hId] = company; return res}, {});
      data.companies = hcompanies;
      debug("Loaded %d companies", companies.length);
      cb(null, data);
    });
  }

  function pathFolders(doc, folders){
    function _path(folder){
      if(!folder.parent)return "";
      return _path(folder.parent) + '/' + folder.name;
    }
    var folder = folders[doc.folder_id];
    if(!folder)return "";
    else return _path(folder);
  }

  function pathDoc(doc){
    var type = doc.owner_type === 'HREF::Fund' ? 'Fund' : 'Partner';
    return path.join(argv.path, type, doc.owner_id.toString());
  }

  function nameDoc(doc, companies){
    var data = doc.translations[0].parts[0]
      , company = companies[doc.owner_id];
    return [company && company.label || 'UnknownCompany', data.label ||  data.filename, moment(data.date).format(data.day_unknown ? 'YYYY MM' : 'YYYY MM DD')].join(" - ") + path.extname(data.filename);
  }

  function absoluteDocPath(doc, data){
    return path.join(pathDoc(doc), pathFolders(doc, data.folders), nameDoc(doc, data.companies));
  }

  function extractFiles(data, cb){

    var bar = new ProgressBar('  extracting [:bar] :percent :etas :file', { complete: '=', incomplete: ' ', width: 40, clear: true, total: data.docs.length });

    function extractFile(doc, cb){
      var docPath = absoluteDocPath(doc, data);

      function mkdirPath(cb){
        mkdirp(path.dirname(docPath), function(err){
          cb(err);
        });
      }

      function openGridStore(cb){
        var gs = new mongodb.GridStore(res.docs, doc.translations[0].parts[0]._id.toString(), "r");
        gs.open(cb);
      }

      function extractContent(gs, cb){
        var stream = gs.stream(true)
          , writeStream = fs.createWriteStream(docPath);

        //console.log(docPath);
        stream.pipe(writeStream);
        //stream.on('data', function(chunk) { console.log(chunk.toString()) });
        stream.on('close', function() { 
          bar.tick({file: docPath});
          cb();
        });
      }


      async.waterfall([
          mkdirPath
        , openGridStore
        , extractContent
      ], function(err){
        if(err)return cb(err);
        cb(null, data);
      });
    }
    //console.log(data)
    async.mapSeries(data.docs, extractFile, function(err){
      if(err)return cb(err);
      debug('All documents extracted in ' + argv.path);
      cb(null, data);
    });
  }

  if (err) throw err;
  debug('Documents database connected ...');
  async.waterfall([ loadFolders.bind(null, {}), loadTypes, loadAllDocs, loadCompanies, extractFiles ], function(err, data){
    if(err) throw err;
    console.log('This is the end, good import ...');
    res.docs.close();
    process.exit()
  });
});
