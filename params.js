module.exports = {
  href: {
    host: 'mongo',
    port: 27017,
    database: 'href',
    auto_reconnect: true,
    poolSize: 10, 
    w: 1, 
    strict: true, 
    native_parser: true,
    webfolioPortfolios:{
      12065: "XISA"
    }
  },
  docs: {
    database: {
      name: 'documents',
      options: {
        w: 1
      }
    },
    collections: {
      documents: {
        name: 'documents',
        options: {
          w: 1,
        }
      },
      types: {
        name: 'types',
        options: {
          w: 1,
        }
      },
      folders: {
        name: 'folders',
        options: {
          w: 1,
        }
      },
    },
    servers: [{
      host: 'mongo',
      port: 27017,
      options: {
        auto_reconnect: true,
        poolSize: 10, 
        native_parser: true
      }
    }]
  },
};
