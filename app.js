
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var querystring = require('querystring');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var mappings = {
  "oVgawdw2AUsfP1e82vVbzc1H6399nQqpRc" : {
    description: "Zara",
    merchant_address: "micVL1jMXRg1PA5nTFxBuSRgx5AR8J9bai"
  },
  "ocRUyPvtRevjB2gsJvkastCHfogkH6RFbk" : {
    description: "Pizza Hut",
    merchant_address: "mnDa2CKtveaiRUNBEgq38Xk9jvkFYmvwda"
  },
  "oLrfD2Gw4hXACyXHKgGHwEgiaz9gBQ4UrX" : {
    description: "Sakae Sushi",
    merchant_address: "msB73iVHn6N2ZCrkcvt3sVcdE6dNHcSaEE"
  },
  "oJTHoyf3gHLFeppiGT6776MFnDgo7xvg2n" : {
    description: "Courts",
    merchant_address: "msx2SEpXv65S9tH1LrL3vbLq2k9jUa8Bst"
  },
  "oR2Jfp82Vc39ziqvCiZonMXEM9FjzuW5bW" : {
    description: "Toy R Us",
    merchant_address: "n1FnmzH89oRUPtEWNLhSzXEhmc9N7LRvhg"
  }
};

function rpc(path, obj, callback) {
	console.log(path);

  var data = querystring.stringify(obj);
  console.log(data);

        var options = {
                host: '127.0.0.1',
                port: 8080,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
        };

        var req = http.request(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                var data = '';
		            res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    data += chunk;
                });

                res.on('end', function (chunk) {
                  console.log('END stream');
                  callback(data);
                });

        });

        req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
        });

        req.write(data);
        req.end();

	console.log('async rpc done');
}

function btc2colored(address, callback) {
        var data = querystring.stringify({
          address: address,
          email: 'balamkumar@gmail.com'
        });

        var options = {
                host: 'api.colu.co',
                port: 80,
                path: '/v1/coloraddress',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
        };

        var req = http.request(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                var data = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    data += chunk;
                });

                res.on('end', function (chunk) {
                  console.log('END stream');
                  callback(JSON.parse(data).adress);
                });

        });

        req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
        });

        console.log(data);
        req.write(data);
        req.end();  
}

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

app.all('/redeem/:address/:asset', function(request, response) {
	var address = request.param('address');
  var asset = request.param('asset');
  var amount = 1;
	console.log('address='+address);
  console.log('asset='+asset);
  console.log('amount='+amount);

  btc2colored(address, function(oa_address) {

    var obj = {
      address: mappings[asset].merchant_address,
      asset: asset,
      amount: amount,
      to: oa_address
    }
    console.log(obj);
    rpc('/sendasset', obj, function(data) {

      response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
      response.end(data);
    });
  });
});

app.all('/pay/:address/:asset/:amount', function(request, response) {
  var asset = request.param('asset');
  var address = request.param('address');
  var amount = request.param('amount');
  console.log('asset='+asset);
  console.log('address='+address);
  console.log('amount='+amount);

  btc2colored(address, function(oa_address) {

    btc2colored(mappings[asset].merchant_address, function(merchant_oa_address) {
      var obj = {
        address: oa_address,
        asset: asset,
        amount: amount,
        to: merchant_oa_address
      }
      console.log(obj);
      rpc('/sendasset', obj, function(data) {

        response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
        response.end(data);
      });
    });
  });
});

app.all('/getassets/:address', function(request, response) {

  var address = request.param('address');

  rpc('/getbalance', {address: address}, function(data) {
    var obj = JSON.parse(data);
    var assets = obj[0].assets;
    for (var i=0; i<assets.length; i++) {
      var asset = assets[i];
      asset.description = mappings[asset.asset_id].description;
      asset.merchant_address = mappings[asset.asset_id].merchant_address;
    }

    console.log(obj);

    response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
    response.end(JSON.stringify(obj, null, 4));
  });
});

app.all('/getbalance', function(request, response) {
  rpc('/getbalance', {}, function(data) {
    response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
    response.end(data);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
