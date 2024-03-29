(function () {
  const ON_DEMAND = 3;
  const CREDIT_CARD = 1;
  const PAYPAL = 3;
  const CS_CREDIT = 2;
  var PedidoDetallesUFReadController = function ($scope, $log, $location, $cookies, PedidoDetallesFactory, TipoCambioFactory, EmpresasXEmpresasFactory, EmpresasFactory, PedidosFactory, ComprasUFFactory, $routeParams, $rootScope) {
    $scope.CreditoValido = 1;
    $scope.error = false;
    $scope.Distribuidor = {};
    $scope.currentDistribuidor = $cookies.getObject('currentDistribuidor');
    const paymentMethods = {
      CREDIT_CARD: 1,
      CS_CREDIT: 2,
      PAYPAL: 3,
      PREPAY: 4,
      SPEI: 5
    };
    const makers = {
      MICROSOFT: 1,
      AUTODESK: 2,
      COMPUSOLUCIONES: 3,
      HP: 4,
      APERIO: 5,
      COMPUCAMPO: 8
    };

    const error = function (error) {
      $scope.ShowToast(!error ? 'Ha ocurrido un error, inténtelo más tarde.' : error.message, 'danger');
      $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';
    };

    const getEnterprises = function () {
      return EmpresasFactory.getEmpresas()
        .then(function (result) {
          $scope.Distribuidor = result.data[0];
        })
        .catch(function (result) {
          error(result.data);
          $location.path('uf/Productos');
        });
    };

    const getPaymentMethods = function (id) {
      let paymentMethod = '';
      switch (id) {
        case paymentMethods.CREDIT_CARD:
          paymentMethod = 'Tarjeta';
          break;
        case paymentMethods.CS_CREDIT:
          paymentMethod = 'Crédito';
          break;
        case paymentMethods.PAYPAL:
          paymentMethod = 'Paypal';
          break;
        case paymentMethods.PREPAY:
          paymentMethod = 'Transferencia';
          break;
        case paymentMethods.SPEI:
          paymentMethod = 'SPEI';
          break;
        default:
          paymentMethod = 'Metodo de pago incorrecto.';
      }
      return paymentMethod;
    };

    const getMakers = function (id) {
      let maker = '';
      switch (id) {
        case makers.MICROSOFT:
          maker = 'Microsoft';
          break;
        case makers.AUTODESK:
          maker = 'Autodesk';
          break;
        case makers.COMPUSOLUCIONES:
          maker = 'Compusoluciones';
          break;
        case makers.APERIO:
          maker = 'Aperio';
          break;
        case makers.HP:
          maker = 'HP';
          break;
        case makers.COMPUCAMPO:
          maker = 'Compucampo';
          break;
        default:
          maker = null;
      }
      return maker;
    };

    const getOrderDetails = function (validate) {
      return PedidoDetallesFactory.getPedidoDetallesUf($scope.currentDistribuidor.IdEmpresa)
        .then(function (result) {
          if (result.data.success) {
            if (result.data.data[0]) {
              $scope.opcionCFDI = result.data.data[0].claveCFDI;
            }
            $scope.PedidoDetalles = result.data.data;
            $scope.PedidoDetalles.forEach(function (elem) {
              elem.Forma = getPaymentMethods(elem.IdFormaPago);
              elem.NombreFabricante = getMakers(elem.IdFabricante);
              elem.Productos.forEach(function (item) {
                if (item.PrecioUnitario == null) $scope.error = true;
              });
            });
            if ($scope.error) {
              $scope.ShowToast('Ocurrió un error al procesar sus productos del carrito. Favor de contactar a soporte de CompuSoluciones.', 'danger');
            }
            if (!validate) {
              $scope.ValidarFormaPago();
            }
          }
        })
        .then(function () {
          if ($scope.isPayingWithCSCredit()) validarCarrito();
        })
        .catch(function (result) { error(result.data); });
    };

    const validarCarrito = function () {
      return PedidoDetallesFactory.getValidarCarrito()
        .then(function (result) {
          if (result.data.success) {
            $scope.PedidoDetalles.forEach(function (item) {
              if ($scope.Distribuidor.IdFormaPagoPredilecta === 1 && item.MonedaPago !== 'Pesos') {
                $scope.ShowToast('Para pagar con tarjeta bancaria es necesario que los pedidos estén en pesos MXNs. Actualiza tu forma de pago o cambia de moneda en los pedidos agregándolos una vez más.', 'danger');
              }
              $scope.CreditoValido = 1;
              item.hasCredit = 1;
              result.data.data.forEach(function (user) {
                if (item.IdEmpresaUsuarioFinal === user.IdEmpresaUsuarioFinal && !user.hasCredit) {
                  $scope.CreditoValido = 0;
                  item.hasCredit = 0;
                }
              });
            });
          } else {
            //$scope.ShowToast('No pudimos validar tu carrito de compras, por favor intenta de nuevo.', 'danger');
            // $location.path('uf/Productos');
          }
        })
        .catch(function (result) {
          error(result.data);
          $location.path('uf/Productos');
        });
    };

    var ActualizarFormaPago = function (IdFormaPago) {
      var empresa = {IdFormaPagoPredilecta: IdFormaPago || $scope.Distribuidor.IdFormaPagoPredilecta};
      EmpresasFactory.putEmpresaFormaPagoFinalUser(empresa)
        .then(function (result) {
          if (result.data.success) {
            $scope.ShowToast(result.data.message, 'success');
            CambiarMoneda();
            getOrderDetails();
          } else $scope.ShowToast(result.data.message, 'danger');
        })
        .catch(function (result) { error(result.data); });
    };

    var CambiarMoneda = function (tipoMoneda) {
      var moneda = { MonedaPago: tipoMoneda || 'Pesos' };
      EmpresasFactory.putEmpresaCambiaMonedaFinalUser(moneda)
      .then(function (result) {
        if (result.data.success) {
          $scope.ShowToast(result.data.message, 'success');
          getOrderDetails();
        } else $scope.ShowToast(result.data.message, 'danger');
      })
      .catch(function (result) { error(result.data); });
    };

    $scope.CambiarUsoCFDI = () => {
      let orders = [];
      $scope.PedidoDetalles.map(order => {
        orders.push(order.IdPedido);
      });
      PedidoDetallesFactory.putUseCFDI($scope.opcionCFDI, orders)
      .then(function (result) {
        if (result.data.success) {
          $scope.ShowToast(result.data.message, 'success');
        } else $scope.ShowToast('Selecciona una opción valida', 'danger');
      })
      .catch(function (result) { error(result.data); });
    };

    $scope.init = function () {
      PedidoDetallesFactory.getUseCFDI()
        .then(function (result) { 
          $scope.useCFDI = result.data.useCFDIList;
        });
      $scope.CheckCookie();
      PedidoDetallesFactory.getPrepararCompraFinalUser(0, $scope.currentDistribuidor.IdEmpresa)
        .then(getEnterprises)
        .then(getOrderDetails)
        .then(ActualizarFormaPago)
        .catch(function (result) { error(result.data); });
    };

    $scope.init();

    const QuitarProductoFinalUser = function (PedidoDetalle) {
      ComprasUFFactory.deleteComprasUF(PedidoDetalle.IdCompraUF)
        .success(function (PedidoDetalleResult) {
          if (PedidoDetalleResult.success) {
          } else {
            $scope.ShowToast(PedidoDetalleResult.message, 'danger');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos quitar el producto seleccionado. Intenta de nuevo más tarde.', 'danger');
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.QuitarProducto = function (PedidoDetalle) {
      $scope.PedidoDetalles.forEach(function (order, indexOrder) {
        order.Productos.forEach(function (product, indexProduct) {
          if (product.IdPedidoDetalle === PedidoDetalle.IdPedidoDetalle) {
            $scope.PedidoDetalles[indexOrder].Productos.splice(indexProduct, 1);
            validarCarrito();
          }
          if ($scope.PedidoDetalles[indexOrder].Productos.length === 0) $scope.PedidoDetalles.splice(indexOrder, 1);
        });
      });

      PedidoDetallesFactory.deletePedidoDetalles(PedidoDetalle.IdPedidoDetalle)
        .success(function (PedidoDetalleResult) {
          if (!PedidoDetalleResult.success) {
            $scope.ShowToast(PedidoDetalleResult.message, 'danger');
            getOrderDetails(true);
          } else {
            $scope.ActualizarMenu();
            $scope.ShowToast(PedidoDetalleResult.message, 'success');
          }
        })
        .then(QuitarProductoFinalUser(PedidoDetalle))
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos quitar el producto seleccionado. Intenta de nuevo más tarde.', 'danger');
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.ActualizarCodigo = function (value) {
      const order = {
        CodigoPromocion: value.CodigoPromocion,
        IdPedido: value.IdPedido
      };
      PedidosFactory.putCodigoPromocion(order)
        .then(function (result) {
          $scope.init();
          $scope.ShowToast(result.data.message, 'success');
        })
        .catch(function (result) { error(result.data); });
    };

    $scope.ValidarFormaPago = function () {
      var disabled = false;
      if ($scope.PedidoDetalles) {
        if (!$scope.PedidoDetalles[0].BanamexCredentials) {
          $scope.BanamexCredentials = 1;
        }
        if (!$scope.PedidoDetalles[0].PaypalCredentials) {
          $scope.PaypalCredentials = 1;
        }
        $scope.PedidoDetalles.forEach(function (order) {
          order.Productos.forEach(function (product) {
            if (product.IdTipoProducto === 3) {
              disabled = true;
              $scope.Distribuidor.IdFormaPago = 2;
              $scope.Distribuidor.IdFormaPagoPredilecta = 2;
            }
          });
        });
      }
      return disabled;
    };

    const hasProtectedExchangeRate = function (orderDetails) {
      return orderDetails.some(function (detail) {
        return detail.TipoCambioProtegido > 0;
      });
    };

    const isOnDemandProduct = function (product) {
      return product.IdTipoProducto === ON_DEMAND;
    };

    const detailHasOnDemandProduct = function (orderDetail) {
      const products = orderDetail.Productos;
      return products.some(isOnDemandProduct);
    };

    const containsOnDemandProduct = function (orderDetails) {
      return orderDetails.reduce(function (accumulator, currentDetail) {
        const hasOndemandProduct = detailHasOnDemandProduct(currentDetail);
        return accumulator || hasOndemandProduct;
      }, false);
    };

    const setPaymentMethod = function (paymentMethod) {
      $scope.Distribuidor.IdFormaPago = paymentMethod;
      $scope.Distribuidor.IdFormaPagoPredilecta = paymentMethod;
    };

    $scope.validateUSD = function () {
      const orderDetails = $scope.PedidoDetalles;
      if (!orderDetails) return false;
      if (hasProtectedExchangeRate(orderDetails)) return false;
      if (containsOnDemandProduct(orderDetails)) {
        setPaymentMethod(CS_CREDIT);
        return false;
      }
      return true;
    };

    $scope.isPayingWithCSCredit = function () {
      return Number($scope.Distribuidor.IdFormaPagoPredilecta) === CS_CREDIT;
    };

    $scope.isPayingWithCreditCard = function () {
      return Number($scope.Distribuidor.IdFormaPagoPredilecta) === CREDIT_CARD;
    };

    $scope.isPayingWithPaypal = function () {
      return Number($scope.Distribuidor.IdFormaPagoPredilecta) === PAYPAL;
    };

    $scope.hasProtectedExchangeRate = function () {
      const orderDetails = $scope.PedidoDetalles;
      if (orderDetails) return hasProtectedExchangeRate(orderDetails);
    };

    $scope.ActualizarFormaPago = ActualizarFormaPago;
    $scope.CambiarMoneda = CambiarMoneda;

    $scope.modificarContratoBase = function (IdProducto, IdPedidoDetalle) {
      $location.path('/autodesk/productos/' + IdProducto + '/detalle/' + IdPedidoDetalle);
    };

    $scope.calcularSubTotal = function (IdPedido) {
      let total = 0;
      $scope.PedidoDetalles.forEach(function (order) {
        order.Productos.forEach(function (product) {
          if (order.IdPedido === IdPedido) {
            if (order.MonedaPago === 'Pesos' && product.MonedaPrecioUF === 'Dólares') {
              total = total + (product.PrecioNormalUF * product.Cantidad) * order.TipoCambio;
            } else if (order.MonedaPago === 'Dólares' && product.MonedaPrecioUF === 'Pesos') {
              total = total + (product.PrecioNormalUF * product.Cantidad) / order.TipoCambio;
            } else {
              total = total + (product.PrecioNormalUF * product.Cantidad);
            }
          }
        });
      });
      return total;
    };

    $scope.calcularIVA = function (IdPedido) {
      let total = $scope.calcularSubTotal(IdPedido);
      if ($scope.Distribuidor.ZonaImpuesto === 'Normal') total = 0.16 * total;
      if ($scope.Distribuidor.ZonaImpuesto === 'Nacional') total = 0.16 * total;
      if ($scope.Distribuidor.ZonaImpuesto === 'Frontera') total = 0.11 * total;
      return total;
    };

    $scope.calcularPrecioRenovacion = function (IdPedido) {
      let total = 0;
      $scope.PedidoDetalles.forEach(function (order) {
        order.Productos.forEach(function (product) {
          if (order.IdPedido === IdPedido) {
            if (order.MonedaPago === 'Pesos' && product.MonedaPrecioUF === 'Dólares') {
              total = product.PrecioRenovacionUF * order.TipoCambio;
            } else if (order.MonedaPago === 'Dólares' && product.MonedaPrecioUF === 'Pesos') {
              total = (product.PrecioRenovacionUF / order.TipoCambio);
            } else {
              total = product.PrecioRenovacionUF;
            }
          }
        });
      });
      return total;
    };

    $scope.calcularTotal = function (IdPedido) {
      let total = $scope.calcularSubTotal(IdPedido);
      let iva = 0;
      if ($scope.Distribuidor.ZonaImpuesto === 'Normal') iva = 0.16 * total;
      if ($scope.Distribuidor.ZonaImpuesto === 'Nacional') iva = 0.16 * total;
      if ($scope.Distribuidor.ZonaImpuesto === 'Frontera') iva = 0.11 * total;
      total = total + iva;
      return total;
    };

    $scope.precioReal = function (precio, monedaPrecio, monedaPago, tipoCambio) {
      let precioUnitario = 0;
      if (monedaPrecio === monedaPago) {
        precioUnitario = precio;
      } else if (monedaPrecio === 'Dólares' && monedaPago === 'Pesos') {
        precioUnitario = precio * tipoCambio;
      } else if (monedaPrecio === 'Pesos' && monedaPago === 'Dólares') {
        precioUnitario = precio / tipoCambio;
      }
      return precioUnitario;
    };

    $scope.next = function () {
      if ($scope.isPayingWithCSCredit()) validarCarrito();
      let next = true;
      if (!$scope.PedidoDetalles || $scope.PedidoDetalles.length === 0) next = false;
      else {
        $scope.PedidoDetalles.forEach(function (order) {
          if (!order.IdEmpresaUsuarioFinal) next = false;
          order.Productos.forEach(function (product) {
            if (product.Cantidad <= 0) next = false;
          });
        });
      }
      if (!$scope.opcionCFDI) {
        $scope.ShowToast('Revisa que tengas seleccionado el uso del CFDI', 'warning');
      } else if (!next) {
        $scope.ShowToast('Revisa que tengas al menos un producto y que tenga un cliente seleccionado con crédito válido.', 'warning');
      } else $location.path('/uf/Comprar');
    };

    $scope.IniciarTourCarrito = function () {
      $scope.Tour = new Tour({

        steps: [{
          element: '.formaPago',
          placement: 'rigth',
          title: 'Forma de pago del distribuidor',
          content: 'Selecciona la forma de pago predilecta para tu empresa, esta es una configuración única para toda la compañia. Si seleccionas pago con tarjeta bancaria tendrás que tener tus pedidos en pesos MXN, si requieres pagar en dólares USD podrás utilizar crédito CompuSoluciones.',
          template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>"
        }],

        backdrop: true,
        storage: false
      });

      $scope.Tour.init();
      $scope.Tour.start();
    };
  };

  PedidoDetallesUFReadController.$inject = ['$scope', '$log', '$location', '$cookies', 'PedidoDetallesFactory', 'TipoCambioFactory', 'EmpresasXEmpresasFactory', 'EmpresasFactory', 'PedidosFactory', 'ComprasUFFactory', '$routeParams', '$rootScope'];

  angular.module('marketplace').controller('PedidoDetallesUFReadController', PedidoDetallesUFReadController);
}());
