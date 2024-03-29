(function () {
  var ParticionPedidosFactory = function ($http, $cookies, $rootScope) {
    var factory = {};
    var Session = {};

    factory.refreshToken = function () {
      Session = $cookies.getObject('Session');
      if (!Session) { Session = { Token: 'no' }; }
      $http.defaults.headers.common['token'] = Session.Token;
    };
    factory.refreshToken();

    factory.getPedidosParticionados = function () {
      factory.refreshToken();
      return $http.get($rootScope.API + 'autodesk/partitioned-orders');
    };

    factory.confirmarParticion = idPedido => {
      factory.refreshToken();
      return $http.post($rootScope.API + 'autodesk/partition-confirmation', { IdPedido: idPedido });
    };

    return factory;
  };
  ParticionPedidosFactory.$inject = ['$http', '$cookies', '$rootScope'];

  angular.module('marketplace').factory('ParticionPedidosFactory', ParticionPedidosFactory);
}());
