(function () {
    var MonitorContratosFactory = function ($http, $cookies, $rootScope) {
      var factory = {};
      var Session = {};
  
      factory.refreshToken = () => {
        Session = $cookies.getObject('Session');
        if (!Session) { Session = { Token: 'no' }; }
        $http.defaults.headers.common['token'] = Session.Token;
      };
  
      factory.refreshToken();
  
      factory.getEndCustomer = () => {
        factory.refreshToken();
        return $http.get($rootScope.API + 'autodesk/get-endCustomer');
      };

      factory.getContractCustomer = (EndCustomerCSN) => {
        factory.refreshToken();
        return $http.get($rootScope.API + 'autodesk/get-contract-customer/' + EndCustomerCSN);
      };
  
      return factory;
    };
  
    MonitorContratosFactory.$inject = ['$http', '$cookies', '$rootScope'];
  
    angular.module('marketplace').factory('MonitorContratosFactory', MonitorContratosFactory);
  }());