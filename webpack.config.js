module.exports = {
    mode: "production",
    entry: {
	bundle: "./src/payment-card.js"
    },
    output: {
        filename: "payment-card.js",
        libraryTarget: "var",
        library: "PaymentCard",
    },
    module: {
        rules: [
          {
            test: /\.html$/,
            use: [
              { loader: 'html-loader' }
            ]
          },
          {
            test: /\.css$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader' }
            ]
          },
          {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
              loader: 'babel-loader',
	    }
          },
          {
              test: /\.(png)$/,  
              use: [{
                  loader: 'url-loader',
                  options: { 
                      limit: 8000,
                      name: 'images/[hash]-[name].[ext]'
                  } 
              }]
  }
        ]
    }
}
