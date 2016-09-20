function implementation(request, response, oauthData) {
    var util = require('util'),
        Promise = require('promised-io/promise'),
        path = require('path'),
        httpHelper = require(path.resolve(process.cwd(), './lib/conectivity/http_helper'));

    var method = request.method,
        self = this,
        destination = request.controllerToRoute,
        authorization = request.headers ? request.headers.authorization : null,
        serviceName = controllerConfiguration.serviceName,
        oauthService = controllerConfiguration.oauthService,
        authorizationType,
        token;

    var deferred = Promise.defer();
    if(authorization) {
        authorization = authorization.split(" ");
        authorizationType = authorization[0];
        token = authorization[1];
        if(authorizationType == 'Bearer') {
            var headers = {
                'Content-Type': 'application/json'
            },
                body = {
                    token: token,
                    service: serviceName
                };


            httpHelper.post(oauthService.host, oauthService.port, oauthService.path, headers, body).then(function(response) {
                var responseBody = response.data;
                console.log(destination);
                console.log(responseBody.rights[destination]);
                if(responseBody.rights[destination] && responseBody.rights[destination].indexOf(method) != -1) {
                    Promise.seq([
                        fn.bind(self, request, response, responseBody),
                    ]).then(function (data) {
                        deferred.resolve(data);
                    }, function(err) {
                        deferred.reject(err);
                    });
                } else {
                    Promise.seq([
                        fn.bind(self, request, response, null),
                    ]).then(function (data) {
                        deferred.resolve(data);
                    }, function(err) {
                        deferred.reject(err);
                    });
                }
            }, function(err) {
                Promise.seq([
                    fn.bind(self, request, response, null),
                ]).then(function (data) {
                    deferred.resolve(data);
                }, function(err) {
                    deferred.reject(err);
                });
            })
        }

    } else {
        Promise.seq([
            fn.bind(self, request, response, null),
        ]).then(function (data) {
            deferred.resolve(data);
        }, function(err) {
            deferred.reject(err);
        });
    }


    return deferred.promise;


}

module.exports = {
    implementation: implementation,
    isDecorator: true
};