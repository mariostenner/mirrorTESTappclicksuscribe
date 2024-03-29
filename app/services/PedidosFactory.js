(function () {
  var PedidosFactory = function ($http, $cookies, $rootScope) {
    var factory = {};
    var Session = {};

    factory.refreshToken = function () {
      Session = $cookies.getObject('Session');
      if (!Session) { Session = { Token: 'no' }; }
      $http.defaults.headers.common['token'] = Session.Token;
    };

    factory.refreshToken();

    factory.putPedido = function (Pedido) {
      factory.refreshToken();
      return $http.put($rootScope.API + 'Pedidos', Pedido);
    };

    factory.putPedidoPago = function (Pedido) {
      factory.refreshToken();
      return $http.put($rootScope.API + 'Pedidos/Pago', Pedido);
    };

    factory.putCodigoPromocion = function (Pedido) {
      factory.refreshToken();
      return $http.put($rootScope.API + 'Pedidos/CodigoPromocion', Pedido);
    };

    factory.patchPaymentInformation = function (paymentResult) {
      factory.refreshToken();
      return $http.patch($rootScope.API + 'orders/update-payment-details', paymentResult);
    };

    factory.patchPedidosParaRenovar = function (paymentResult) {
      factory.refreshToken();
      return $http.patch($rootScope.API + 'tuclick/update-payment-details', paymentResult);
    };

    factory.patchPaymentInformationPayPal = function (paymentResult) {
      factory.refreshToken();
      return $http.patch($rootScope.API + 'orders/update-payment-details', paymentResult);
    };

    factory.patchPaymentInformationPrePaid = function (paymentResult) {
      factory.refreshToken();
      return $http.post($rootScope.API + 'orders/pay-with-prepaid', paymentResult);
    };

    factory.renewContract = function (contractData) {
      factory.refreshToken();
      return $http.post($rootScope.API + 'autodesk/contracts/renew', contractData);
    };

    factory.renewContractTuClick = function (contractData, currentDistribuidor) {
      factory.refreshToken();
      return $http.post($rootScope.API + 'autodesk/contracts/renew/tuclick/' + currentDistribuidor, contractData);
    };
    
    factory.viabilityAddSeatMS = (order, idEmpresa) => {
      factory.refreshToken();
      return $http.post($rootScope.API + 'orders/existing-order-microsoft', { IdProducto: order.IdProducto, IdEmpresaDistribuidor: idEmpresa, IdEmpresaUsuarioFinal: order.IdEmpresaUsuarioFinal, IdEsquemaRenovacion: order.Esquema});
    };

    return factory;
  };

  PedidosFactory.$inject = ['$http', '$cookies', '$rootScope'];

  angular.module('marketplace').factory('PedidosFactory', PedidosFactory);
}());
