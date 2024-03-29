(function () {
  var MonitorReadController = function ($scope, $log, $cookies, $location, EmpresasXEmpresasFactory, PedidoDetallesFactory, $uibModal, $filter, FabricantesFactory, PedidosFactory, EmpresasFactory, UsuariosFactory, AmazonDataFactory, ActualizarCSNFactory, ProductosFactory, ManejoLicencias) {
    $scope.EmpresaSelect = 0;
    var Params = {};
    $scope.form = {};
    $scope.form.habilitar = false;
    $scope.Vacio = 0;
    $scope.orders = false;
    $scope.BuscarProductos = {};
    $scope.Contrato = {};
    $scope.terminos = false;
    $scope.SessionCookie = $cookies.getObject('Session');
    const FAILED = 'FAILED';
    const FAILED_1 = 'failed';
    const ERROR = 'error';
    const ACCEPTED = 'accepted';
    const PROCESSING = 'processing';

    $scope.init = function () {
      const getAvailableCredit = 0;
      $scope.CheckCookie();
      FabricantesFactory.getFabricantes()
        .then(fabricantes => $scope.selectFabricantes = fabricantes.data)
        .catch(() => $scope.ShowToast('No pudimos cargar la lista de fabricantes, por favor intenta de nuevo más tarde.', 'danger'));
      EmpresasXEmpresasFactory.getClients(getAvailableCredit)
        .then(empresas => $scope.selectEmpresas = empresas.data)
        .catch(() => $scope.ShowToast('No pudimos cargar la lista de clientes, por favor intenta de nuevo más tarde.', 'danger'));

      if ($cookies.getObject('Session').IdTipoAcceso == 4 || $cookies.getObject('Session').IdTipoAcceso == 5 || $cookies.getObject('Session').IdTipoAcceso == 6) {
        Params.IdEmpresaUsuarioFinal = $cookies.getObject('Session').IdEmpresa;
        if (!$scope.BuscarProductos.IdFabricante) {
          $scope.BuscarProductos.IdFabricante = 0;
        }
        Params.IdFabricante = $scope.BuscarProductos.IdFabricante;
      }
    };

    const getOrderPerCustomer = function (customer) {
      PedidoDetallesFactory.getOrderPerCustomer(Params)
        .then(function (result) {
          if (result.status === 204) {
            $scope.Vacio = 0;
            $scope.Pedidos = '';
            $scope.PedidosBusqueda = '';
          } else if (result.status === 200) {
            $scope.Pedidos = $scope.PedidosBusqueda = result.data.data;
            $scope.Pedidos.forEach(pedido => {
              pedido.Detalles.forEach(detalle => {
                switch(detalle.EstatusFabricante) {
                  case FAILED:
                    detalle.failedOrder = true;
                  break;
                  case PROCESSING:
                    detalle.processingOrder = true;
                  break;
                  case FAILED_1:
                    detalle.failedOrder = true;
                  break;
                  case ERROR:
                    detalle.failedOrder = true;
                  break;
                  case ACCEPTED:
                    detalle.acceptedOrder = true;
                  break;
                }
              });
              ProductosFactory.getNCProduct(pedido.Detalles[0].IdErp)
              .success(function (result) {
              pedido.productoNC = result ? true : false;
              });
              pedido.optionDeleteMS = pedido.CancelarPedido === 0 ? false : evaluationDeleteMS(pedido.FechaInicio);
            });
            $scope.Vacio = 1;
          }
          pagination();
        })
        .catch(function (result) {
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    const evaluationDeleteMS = function (FechaInicio) {
      splitDate = FechaInicio.split('/');
      dateFormat = `${splitDate[2]}/${splitDate[1]}/${splitDate[0]}`;
      const now = new Date();
      const limitDate = new Date(dateFormat);
      limitDate.setDate(limitDate.getDate() + 5);
      return now > limitDate ? false : true;
    }

    const pagination = () => {
      $scope.filtered = [];
      $scope.currentPage = 1;
      $scope.numPerPage = 10;
      $scope.maxSize = 5;

      $scope.$watch('currentPage + numPerPage', function () {
        let begin = (($scope.currentPage - 1) * $scope.numPerPage),
          end = begin + $scope.numPerPage;
        $scope.filtered = $scope.PedidosBusqueda.slice(begin, end);
      });
    };

    $scope.init();

    $scope.ActualizarMonitor = function () {
      Params.IdEmpresaUsuarioFinal = $scope.EmpresaSelect;
      if ($scope.EmpresaSelect === null || $scope.EmpresaSelect === undefined) {
        Params.IdEmpresaUsuarioFinal = $cookies.getObject('Session').IdEmpresa;
      }
      Params.IdFabricante = $scope.BuscarProductos.IdFabricante;
      if (Params.IdFabricante === 1) {
        $scope.Contrato.tipo = 'all';
      }
      if (Params.IdFabricante && $scope.EmpresaSelect) {
        getOrderPerCustomer(Params);
        if (Params.IdFabricante === 2) {
          ActualizarCSNFactory.getUfCSN(Params.IdEmpresaUsuarioFinal)
          .then(result => {
            if (result.data.success) {
              $scope.mensajeCSN = undefined;
              $scope.BuscarProductos.csnUf = $scope.BuscarProductos.IdAutodeskUF = result.data.data.CSN ? result.data.data.CSN : '';
            } else $scope.ShowToast('No pudimos cargar el csn de este cliente.', 'danger');
          })
          .catch(() => $scope.ShowToast('No pudimos cargar el csn de este cliente, por favor intenta de nuevo más tarde.', 'danger'));
        }
      }
      getTerminos($scope.EmpresaSelect);
    };

    $scope.updateUfCSN = (IdEmpresaUf, csn, BuscarProductos) => {
      csn = !csn ? null : csn;
      validateCSN(csn)
      .then((r) => {
        if (r.estatus) {
        ActualizarCSNFactory.updateUfCSN(IdEmpresaUf, csn)
          .then(result => {
            result.data.success ? $scope.ShowToast('Información actualizada.', 'success') : $scope.ShowToast('No fue posible actualizar la información', 'danger');
            BuscarProductos.csnUf = BuscarProductos.IdAutodeskUF = csn
            $scope.mensajeCSN = r.mensaje;
            $scope.color = 'rgb(25,185,50)';
          })
          .catch(() => {
            $scope.ShowToast('No fue posible actualizar la información, por favor intenta más tarde.', 'danger');
          });
        } else {
          $scope.mensajeCSN = r.mensaje;
          BuscarProductos.csnUf = BuscarProductos.IdAutodeskUF;
          $scope.color = 'rgb(230,8,8)';
          $scope.$apply();
        }
      })
    };

    const validateCSN = async (csn) => {
      if (!csn) return { mensaje: `CSN vacío.`, estatus: false}
      return ActualizarCSNFactory.validateCSN(csn)
        .then(result => {
          if (result.data.success) {
            if (result.data.data.error) return { mensaje: `CSN: ${csn} no válido.`, estatus: false};
              const data = result.data.data;
              return !data.victimCsn ? { mensaje: `CSN: ${csn} válido. Pertenece a ${data.name}`, estatus: true}
              : { mensaje: `CSN: ${csn} inactivo. El CSN correcto es ${data.csn}. Pertenece a ${data.name}`, estatus: false};
          } else {
            return { mensaje: `CSN ${csn} no válido.`, estatus: false};
          }
        })};

    $scope.ActualizarCantidad = function (IdPedidoDetalle) {
      $scope.Pedidos.forEach(function (Pedido) {
        if (Pedido.IdPedidoDetalle == IdPedidoDetalle) {
          if (Pedido.IdTipoProducto !== 6) Pedido.MostrarCantidad = !Pedido.MostrarCantidad;
        }
        Pedido.Detalles.forEach(function (Detalles) {
          if (Detalles.IdPedidoDetalle === IdPedidoDetalle) {
            Detalles.MostrarCantidad = !Detalles.MostrarCantidad;
          }
        }, this);
      }, this);
    };

    $scope.Confirmar = function (IdPedidoDetalle) {
      $scope.Pedidos.forEach(function (Pedido) {
        Pedido.Detalles.forEach(function (Detalles) {
          if (Detalles.IdPedidoDetalle === IdPedidoDetalle) {
            Detalles.Mostrar = !Detalles.Mostrar;
          }
        }, this);
      }, this);
    };

    $scope.ActualizarPedidosAlCambiarMonedaOFormaPago = function (pedidoRecienActualizado) {
      for (var i = 0; i < $scope.Pedidos.length; i++) {
        if ($scope.Pedidos[i].IdPedido === pedidoRecienActualizado.IdPedido) {
          $scope.Pedidos[i].IdFormaPagoProxima = parseInt(pedidoRecienActualizado.IdFormaPagoProxima);
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
          $scope.ShowToast('No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');
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
          $scope.ShowToast('No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');
        });
    };

    $scope.ActualizarDetalle = function (pedido, detalles) {
      if (pedido.IdFabricante !== 5 && (detalles.CantidadProxima <= 0 || !detalles.CantidadProxima) && pedido.IdFabricante !== 7) {
        $scope.ShowToast('Cantidad no válida para el producto', 'danger');
        return false;
      }
      if (pedido.IdFabricante !== 5 && (detalles.CantidadProxima > detalles.Cantidad) && pedido.IdFabricante !== 7 && pedido.IdFabricante !== 1) {
        $scope.ShowToast('No se puede actualizar a un número mayor de suscripciones.', 'danger');
        return;
      }

      var PedidoActualizado = {
        IdPedidoDetalle: detalles.IdPedidoDetalle,
        IdEmpresaUsuarioFinal: Params.IdEmpresaUsuarioFinal,
        MonedaCosto: detalles.MonedaPrecio,
        CantidadProxima: detalles.CantidadProxima,
        CargoRealizadoProximoPedido: pedido.CargoRealizadoProximoPedido,
        PorCancelar: 0,
      };
      if (!detalles.Activo) {
        PedidoActualizado.PorActualizarCantidad = 0;
      } else {
        if (detalles.CantidadProxima === detalles.Cantidad) {
          PedidoActualizado.PorActualizarCantidad = 0;
        } else {
          PedidoActualizado.PorActualizarCantidad = 1;
        }
      }
      if (detalles.Cantidad !== detalles.CantidadProxima) {
        const detail = {
          CantidadProxima: detalles.CantidadProxima,
          IdPedidoDetalle: detalles.IdPedidoDetalle,
          IdEmpresaUsuarioFinal: Params.IdEmpresaUsuarioFinal,
          IdPedido: pedido.IdContrato ? detalles.IdPedido : pedido.IdPedido
        };
        PedidoDetallesFactory.updateSubscriptionNextQuantity(detail)
          .then(function (updateResult) {
            $scope.ShowToast(updateResult.data.message, 'success');
          })
          .catch(function (error) {
            $scope.ShowToast(error.data.message, 'danger');
          });
      }
      pedido.Detalles[0].PorCancelar = 0;
      PedidoDetallesFactory.putPedidoDetalle(PedidoActualizado)
        .success(async PedidoDetalleSuccess => {
          await PedidoDetallesFactory.postPartitionFlag(pedido)
            .then(() => {
              if (PedidoDetalleSuccess.success) {
                detalles.MostrarCantidad = 0;
                detalles.PorCancelar = 0;
                $scope.ShowToast(PedidoDetalleSuccess.message, 'success');
              } else {
                $scope.ShowToast(PedidoDetalleSuccess.message, 'danger');
              }
            })
            .catch(result => {
              $scope.ShowToast(result.data.message, 'danger');
            })
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde', 'danger');
        });
    };

    $scope.tomarFechaFin = function () {
      var FechaFin = new Date();
      FechaFin.setDate(22);
      FechaFin.setMonth(FechaFin.getMonth() + 2);
      return FechaFin;
    };

    $scope.actualizarEstatusRenovacion = function(status, pedido,detalle){
      ManejoLicencias.updateStatusAutoRenew(pedido.IdMicrosoftUF, detalle.IdSubscription, status, detalle.IdPedidoDetalle, detalle.Cantidad, detalle.CantidadProxima)
      .then(function () {
        if (!status) { 
          $scope.ShowToast('Se desactivo la renovación automática', 'success');
        } else $scope.ShowToast('Se activo la renovación automática', 'success');
      })
      .catch(function () {
        $scope.ShowToast('No es posible actualizar el estatus de renovación automática', 'danger');
      })
    };

    $scope.CancelarRenovacion = function (pedido, detalles) {
      const params = {
        CargoRealizadoProximoPedido: pedido.CargoRealizadoProximoPedido,
        PorCancelar: 1,
        ResultadoFabricante1: detalles.EstatusFabricante,
        IdTipoProducto: detalles.IdTipoProducto,
        IdPedidoDetalle: detalles.IdPedidoDetalle
      };
      pedido.Detalles[0].PorCancelar = 1;
      PedidoDetallesFactory.putPedidoDetalle(params)
        .then(async result => {
          detalles.PorCancelar = 1;
          detalles.MostrarCantidad = 0;
          $scope.ShowToast(result.data.message, 'success');
        })
        .catch(function (result) {
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    $scope.CancelarPedido = function (Pedido, Detalles) {
      $scope.Cancelar = true;
      $scope.guardar = Pedido;
      $scope.form.habilitar = true;
      $scope.$emit('LOAD');
      const inicio = Pedido.FechaInicio.split('/');
      const hoy = new Date();
      const order = {
        CargoRealizadoProximoPedido: Number(Pedido.CargoRealizadoProximoPedido),
        Activo: 0,
        PorCancelar: 1,
        ResultadoFabricante1: Detalles.EstatusFabricante,
        IdTipoProducto: Detalles.IdTipoProducto,
        IdPedidoDetalle: Detalles.IdPedidoDetalle,
        FechaInicio: inicio[2] + '-' + inicio[1] + '-' + inicio[0],
        FechaFin: hoy.getFullYear() + '-' + (hoy.getUTCMonth() + 1).toString().padStart(2, 0) + '-' + hoy.getDate().toString().padStart(2, 0),
        IdProducto: Detalles.IdProducto,
        IdEsquemaRenovacion: Pedido.IdEsquemaRenovacion,
        IdPedido: Pedido.IdPedido,
        ProductoNC: Pedido.productoNC,
      };
      if (Pedido.IdFabricante === 1) {
        PedidoDetallesFactory.putPedidoDetalleMicrosoft(order)
        .success(function (result) {
          if (result.success === 0 || result.name === 'Error') {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ShowToast('Suscripción cancelada.', 'success');
          }
          $scope.$emit('UNLOAD');
          $scope.Cancelar = false;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
          if (!result) $scope.ShowToast('Ocurrió un error.', 'danger');
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast(data.message, 'danger');
        });
      } else {
        PedidoDetallesFactory.putPedidoDetalle(order)
        .success(function (result) {
          $scope.ShowToast('Suscripción cancelada.', 'success');
          $scope.$emit('UNLOAD');
          $scope.Cancelar = false;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast(data.message, 'danger');
        });
      }
    };

    $scope.validarInfoPedido = function (modal, pedido, detalle) {
      const CREDITO = 2;
      if (pedido.IdFormaPagoProxima === CREDITO && pedido.EsOrdenInicial === 0 && pedido.IdEsquemaRenovacion === 1) {
        $scope.obtenerProrrateo(pedido, detalle);
        $scope.abrirModal(modal, pedido, detalle);
      }
      else $scope.CancelarPedido(pedido, detalle);
    };

    $scope.obtenerProrrateo = function (pedido, detalle) {
      const MENSUAL = 1;
      if (pedido.IdEsquemaRenovacion === MENSUAL) {
        PedidoDetallesFactory.getProratePriceMonth(pedido, detalle)
        .success(function (result) {
          $scope.prorrateo = result.data;
        });
      } else {
        PedidoDetallesFactory.getProratePriceAnnual(pedido, detalle)
        .success(function (result) {
          $scope.prorrateo = result.data;
        });
      }
    };

    $scope.abrirModal = function (modal, pedido, detalle) {
      document.getElementById(modal).style.display = 'block';
      $scope.fechaInicio = new Date(pedido.FechaInicio);
      $scope.nvaFechaFin = new Date();
      $scope.infoPedido = pedido;
      $scope.infoDetalle = detalle;
    };

    $scope.cerrarModal = function (modal) {
      document.getElementById(modal).style.display = 'none';
    };

    $scope.Reanudar = function (pedido, detalles) {
      const order = {
        CargoRealizadoProximoPedido: Number(pedido.CargoRealizadoProximoPedido),
        Activo: 1,
        PorCancelar: 0,
        ResultadoFabricante1: detalles.EstatusFabricante,
        IdTipoProducto: detalles.IdTipoProducto,
        IdPedidoDetalle: detalles.IdPedidoDetalle,
        FechaInicio: pedido.FechaInicio,
        FechaFin: new Date(),
        IdProducto: detalles.IdProducto,
        IdEsquemaRenovacion: pedido.IdEsquemaRenovacion,
        IdPedido: pedido.IdPedido
      };
      $scope.form.habilitar = true;
      if (detalles.Cantidad !== detalles.CantidadProxima) {
        order.PorActualizarCantidad = 1;
      }
      if (pedido.IdFabricante === 1) {
        PedidoDetallesFactory.putPedidoDetalleMicrosoft(order)
        .success(function (result) {
          if (!result) {
            $scope.ShowToast('Ocurrió un error', 'danger');
          } else {
            $scope.ShowToast(result.message, 'danger');
          }
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        })
        .catch(function (error) {
          $scope.ShowToast(error.data.message, 'danger');
          $log.log('data error: ' + error.data.message + ' status: ' + error.status + ' headers: ' + error.headers + ' config: ' + error.config);
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        });
      } else {
        PedidoDetallesFactory.putPedidoDetalle(order)
        .success(function (result) {
          if (!result.success) {
            $scope.ShowToast(result.message, 'danger');
          } else {
            $scope.ShowToast('Suscripción reanudada.', 'success');
          }
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        })
        .catch(function (error) {
          $scope.ShowToast(error.data.message, 'danger');
          $log.log('data error: ' + error.data.message + ' status: ' + error.status + ' headers: ' + error.headers + ' config: ' + error.config);
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        });
      }
    };

    $scope.PedidoDetalleCancel = function () {
      $location.path('/PedidoDetalles');
    };

    const getTerminos = function (IdEmpresa) {
      EmpresasXEmpresasFactory.getAcceptanceAgreementByClient(IdEmpresa)
        .success(function (result) {
          if (!result.AceptoTerminosMicrosoft) {
            $scope.terminos = false;
          } else {
            $scope.terminos = true;
          }
        })
        .catch(function (error) {
          $scope.ShowToast(error.data.message, 'danger');
          $log.log('data error: ' + error.data.message + ' status: ' + error.status + ' headers: ' + error.headers + ' config: ' + error.config);
          $scope.form.habilitar = true;
          $scope.ActualizarMonitor();
          $scope.form.habilitar = false;
        });
    };

    $scope.AceptarTerminos = function (IdEmpresa) {
      PedidoDetallesFactory.acceptAgreement(IdEmpresa)
      .success(function (result) {
        if (!result.success) {
          $scope.ShowToast('Ocurrió un error, favor de contactar a Soporte', 'danger');
        } else {
          $scope.ShowToast('Terminos y condiciones aceptados.', 'success');
          $scope.ActualizarMonitor();
        }
        $scope.form.habilitar = true;
        $scope.ActualizarMonitor();
        $scope.form.habilitar = false;
      })
      .catch(function (error) {
        $scope.ShowToast(error.data.message, 'danger');
        $log.log('data error: ' + error.data.message + ' status: ' + error.status + ' headers: ' + error.headers + ' config: ' + error.config);
        $scope.form.habilitar = true;
        $scope.ActualizarMonitor();
        $scope.form.habilitar = false;
      });
    };

    $scope.IniciarTourMonitor = function () {
      $scope.Tour = new Tour({
        steps: [
          {
            element: '.selectOption',
            placement: 'bottom',
            title: 'Selecciona un cliente',
            content: 'Para comenzar, selecciona un cliente para poder ver sus pedidos. Aquí podrás cancelar o renovar suscripciones, disminuir asientos para la renovación y consultar todos los pedidos generados.',
            template: '<div class="popover tour"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div><div class="popover-navigation"><button class="btn btn-default" data-role="prev">« Atrás</button><button class="btn btn-default" data-role="next">Sig »</button><button class="btn btn-default" data-role="end">Finalizar</button></nav></div></div>'
          }
        ],

        backdrop: true,
        storage: false
      });

      $scope.Tour.init();
      $scope.Tour.start();
    };

    $scope.InsertarOrdenCompra = function (idPedido,ordenCompraProxima) {
      const order = {
        IdPedido: idPedido,
        OrdenCompraProxima: ordenCompraProxima
      }
      PedidoDetallesFactory.InsertarOrdenCompra(order.IdPedido,order.OrdenCompraProxima)
      .then(result => {
        $scope.ShowToast(result.data.message, 'success');
      })
      .catch(result => {
        $scope.ShowToast(result.data.message, 'danger');
    });
  }

  $scope.insertAzureBudget = function (IdMicrosoftUF,azureBudget) {
    if(azureBudget > 0){
      const order = {
        IdMicrosoftUF: IdMicrosoftUF,
        azureBudget: azureBudget
      }
      PedidoDetallesFactory.insertAzureBudget(order.IdMicrosoftUF,order.azureBudget)
      .then(result => {
        $scope.ShowToast(result.data.message, 'success');
      })
      .catch(result => {
        $scope.ShowToast(result.data.message, 'danger');
    });
    }else{
      $scope.ShowToast('El valor debe ser mayor a cero', 'danger');
    }

}


    $scope.cerrarModal = modal => {
      document.getElementById(modal).style.display = 'none';
    };

    $scope.buscar = pedidoFilter => {
      let resultados = [];
      $scope.Pedidos.forEach(pedido => {
        if (pedido.NumeroContrato.toString().toUpperCase().indexOf(pedidoFilter.toUpperCase()) >= 0) resultados.push(pedido);
      });
      $scope.PedidosBusqueda = resultados;
      pagination();
    };
  
  };

  MonitorReadController.$inject = ['$scope', '$log', '$cookies', '$location', 'EmpresasXEmpresasFactory', 'PedidoDetallesFactory', '$uibModal', '$filter', 'FabricantesFactory', 'PedidosFactory', 'EmpresasFactory', 'UsuariosFactory','AmazonDataFactory', 'ActualizarCSNFactory', 'ProductosFactory', 'ManejoLicencias'];

  angular.module('marketplace').controller('MonitorReadController', MonitorReadController);

}());
