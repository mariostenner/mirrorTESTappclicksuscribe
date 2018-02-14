(function () {
  var MonitorReadController = function ($scope, $log, $cookies, $location, EmpresasXEmpresasFactory, PedidoDetallesFactory, $uibModal, $filter, FabricantesFactory, PedidosFactory, EmpresasFactory) {
    $scope.EmpresaSelect = 0;
    var Params = {};
    $scope.form = {};
    $scope.form.habilitar = false;
    $scope.Vacio = 0;
    $scope.Pedidos = {};
    $scope.orders = false;
    $scope.BuscarProductos = {};
    $scope.SessionCookie = $cookies.getObject('Session');

    $scope.init = function () {
      $scope.CheckCookie();
      FabricantesFactory.getFabricantes()
        .success(function (Fabricantes) {
          $scope.selectFabricantes = Fabricantes;
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos cargar la lista de fabricantes, por favor intenta de nuevo más tarde.', 'danger');
        });
      EmpresasXEmpresasFactory.getEmpresasXEmpresas()
        .success(function (Empresas) {
          $scope.selectEmpresas = Empresas;
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      if ($cookies.getObject('Session').IdTipoAcceso == 4 || $cookies.getObject('Session').IdTipoAcceso == 5 || $cookies.getObject('Session').IdTipoAcceso == 6) {
        Params.IdEmpresaUsuarioFinal = $cookies.getObject('Session').IdEmpresa;
        if (!$scope.BuscarProductos.IdFabricante) {
          $scope.BuscarProductos.IdFabricante = 0;
        }
        Params.IdFabricante = $scope.BuscarProductos.IdFabricante;
        // PedidoDetallesFactory.postMonitor(Params)
        //   .success(function (result) {
        //     $scope.Pedidos = result.data[0];
        //     if (result == '') {
        //       $scope.Vacio = 0;
        //       $scope.EmpresaSelect = 'a';
        //     } else {
        //       $scope.Vacio = 1;
        //     }
        //   })
        //   .error(function (data, status, headers, config) {
        //     $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        //   });
      }
    };

    const getOrderPerCustomer = function (customer) {
      PedidoDetallesFactory.postMonitor(Params)
        .success(function (result) {
          $scope.Pedidos = result.data[0];
          $scope.orders = $scope.Pedidos.map(r => r.IdPedido);
          console.log($scope.orders)
          if ($scope.EmpresaSelect == null || $scope.EmpresaSelect == 0) {
            $scope.Vacio = 1;
          } else {
            if (result == '') {
              $scope.Vacio = 0;
            } else {
              $scope.Vacio = 1;
            }
          }
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('Ocurrio un error al cargar los datos del cliente, por favor intenta de nuevo más tarde.', 'danger');
        });
    };

    $scope.init();

    $scope.ActualizarMonitor = function () {
      Params.IdEmpresaUsuarioFinal = $scope.EmpresaSelect;
      if ($scope.EmpresaSelect === 0) {
        Params.IdEmpresaUsuarioFinal = $cookies.getObject('Session').IdEmpresa;
      }
      Params.IdFabricante = $scope.BuscarProductos.IdFabricante;
      if (Params.IdFabricante) {
        getOrderPerCustomer(Params);
      }
    };

    $scope.ActualizarCantidad = function (IdPedidoDetalle) {
      $scope.Pedidos.forEach(function (Pedido) {
        if (Pedido.IdPedidoDetalle == IdPedidoDetalle) {
          Pedido.MostrarCantidad = !Pedido.MostrarCantidad;
        }
      }, this);
    };

    $scope.Confirmar = function (IdPedidoDetalle) {
      $scope.Pedidos.forEach(function (Pedido) {
        if (Pedido.IdPedidoDetalle == IdPedidoDetalle) {
          Pedido.Mostrar = !Pedido.Mostrar;
        }
      }, this);
    };

    $scope.ActualizarPedidosAlCambiarMonedaOFormaPago = function (pedidoRecienActualizado) {
      for (var i = 0; i < $scope.Pedidos.length; i++) {
        if ($scope.Pedidos[i].IdPedido === pedidoRecienActualizado.IdPedido) {
          $scope.Pedidos[i].IdFormaPagoProxima = pedidoRecienActualizado.IdFormaPagoProxima;
          $scope.Pedidos[i].MonedaPagoProxima = pedidoRecienActualizado.MonedaPagoProxima;
        }
      }
    };

    $scope.ActualizarMoneda = function (pedido) {
      var APedido = {
        IdPedido: pedido.IdPedido,
        IdFormaPagoProxima: pedido.IdFormaPagoProxima,
        MonedaPagoProxima: pedido.MonedaPagoProxima
      };
      PedidosFactory.putPedidoPago(APedido)
        .success(function (result) {
          if (result.success === 0) {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ActualizarPedidosAlCambiarMonedaOFormaPago(APedido);
            $scope.ShowToast(result.message, 'success');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.ActualizarPago = function (pedido) {
      var APedido = {
        IdPedido: pedido.IdPedido,
        IdFormaPagoProxima: pedido.IdFormaPagoProxima,
        MonedaPagoProxima: pedido.MonedaPagoProxima
      };
      PedidosFactory.putPedidoPago(APedido)
        .success(function (result) {
          if (result.success === 0) {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ActualizarPedidosAlCambiarMonedaOFormaPago(APedido);
            $scope.ShowToast(result.message, 'success');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.ActualizarDetalle = function (Pedido) {
      if (Pedido.CantidadProxima <= 0 || Pedido.CantidadProxima === undefined || Pedido.CantidadProxima === null) {
        $scope.ShowToast('Cantidad no válida para el producto', 'danger');
        return false;
      }
      if (Pedido.CantidadProxima > Pedido.Cantidad) {
        $scope.ShowToast('No se puede actualizar a un numero mayor de suscripciones.', 'danger');
        return;
      }
      var PedidoActualizado =
        {
          IdPedidoDetalle: Pedido.IdPedidoDetalle,
          IdEmpresaUsuarioFinal: Pedido.IdEmpresaUsuarioFinal,
          MonedaCosto: Pedido.MonedaPrecio,
          CantidadProxima: Pedido.CantidadProxima,
          CargoRealizadoProximoPedido: Pedido.CargoRealizadoProximoPedido,
          IdEstatusPedido: 1
        };

      if (Pedido.Activo === 0) {
        PedidoActualizado.PorActualizarCantidad = 0;
      } else {
        if (Pedido.CantidadProxima === Pedido.Cantidad) {
          PedidoActualizado.PorActualizarCantidad = 0;
        } else {
          PedidoActualizado.PorActualizarCantidad = 1;
        }
      }

      PedidoDetallesFactory.putPedidoDetalle(PedidoActualizado)
        .success(function (PedidoDetalleSuccess) {

          if (PedidoDetalleSuccess.success == 1) {
            $scope.ShowToast(PedidoDetalleSuccess.message, 'success');
          }
          else {
            $scope.ShowToast(PedidoDetalleSuccess.message, 'danger');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.tomarFechaFin = function () {
      var FechaFin = new Date();
      FechaFin.setDate(22);
      FechaFin.setMonth(FechaFin.getMonth() + 2);

      return FechaFin;
    };

    $scope.CancelarPedido = function (Pedido) {
      $scope.Cancelar = true;
      $scope.guardar = Pedido;
      Pedido.Activo = 0;
      Pedido.PorCancelar = 1;
      $scope.form.habilitar = true;
      $scope.$emit('LOAD');
      PedidoDetallesFactory.putPedidoDetalle(Pedido)
        .success(function (result) {
          if (result.success == false) {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ShowToast('Suscripción cancelada.', 'success');
          }
          $scope.$emit('UNLOAD');
          $scope.Cancelar = false;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.Reanudar = function (pedido) {
      pedido.Activo = 1;
      pedido.PorCancelar = 0;
      $scope.form.habilitar = true;
      if (pedido.Cantidad !== pedido.CantidadProxima) {
        pedido.PorActualizarCantidad = 1;
      }
      PedidoDetallesFactory.putPedidoDetalle(pedido)
        .success(function (result) {
          if (result.success == false) {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ShowToast('Suscripción reanudada.', 'success');
          }
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.PedidoDetalleCancel = function () {
      $location.path("/PedidoDetalles");
    };

    $scope.IniciarTourMonitor = function () {
      $scope.Tour = new Tour({
        steps: [
          {
            element: ".selectOption",
            placement: "bottom",
            title: "Selecciona un cliente",
            content: "Para comenzar, selecciona un cliente para poder ver sus pedidos. Aquí podrás cancelar o renovar suscripciones, disminuir asientos para la renovación y consultar todos los pedidos generados.",
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>"
          }
        ],

        backdrop: true,
        storage: false
      });

      $scope.Tour.init();
      $scope.Tour.start();
    };
  };

  MonitorReadController.$inject = ['$scope', '$log', '$cookies', '$location', 'EmpresasXEmpresasFactory', 'PedidoDetallesFactory', '$uibModal', '$filter', 'FabricantesFactory', 'PedidosFactory', 'EmpresasFactory'];

  angular.module('marketplace').controller('MonitorReadController', MonitorReadController);
}());
