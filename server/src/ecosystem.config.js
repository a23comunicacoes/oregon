module.exports = {
    apps: [
      {
        name: 'node-oregon',
        script: 'index.js', // substitua pelo seu script de entrada
        watch: true,
        time: true,
        log_file: 'logs/pm2-g.log',
        out_file: 'logs/pm2.log',
        error_file: 'logs/pm2-error.log',
        combine_logs: true,
        ignore_watch: [
          'node_modules',
          'files',
          'uploads',
        ],
        watch_options: {
          followSymlinks: false
        }
      }
    ]
  };