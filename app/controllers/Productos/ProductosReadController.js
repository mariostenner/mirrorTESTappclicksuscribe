(function () {
  var ProductosReadController = function ($scope, $log, $location, $cookieStore, $routeParams, ProductosFactory, FabricantesFactory, TiposProductosFactory, PedidoDetallesFactory, TipoCambioFactory, ProductoGuardadosFactory, EmpresasXEmpresasFactory, UsuariosFactory, $anchorScroll) {
    var BusquedaURL = $routeParams.Busqueda;
    $scope.BuscarProductos = {};
    $scope.Pagina = 0;
    $scope.sortBy = 'Nombre';
    $scope.reverse = false;
    $scope.TipoCambio = 0;
    $scope.TipoCambioMs = 0;
    $scope.Mensaje = '...';
    $scope.selectProductos = {};

    $scope.BuscarProducto = function (ResetPaginado) {
      $scope.Mensaje = 'Buscando...';

      if (ResetPaginado == true) {
        $scope.Pagina = 0;
        $scope.BuscarProductos.Offset = $scope.Pagina * 6;
      }

      ProductosFactory.postBuscarProductos($scope.BuscarProductos)
        .success(function (Productos) {
          if (Productos.success === 1) {
            $scope.Productos = Productos.data[0];
            if ($scope.Productos == '') {
              $scope.Mensaje = 'No encontramos resultados de tu búsqueda...';
              if ($scope.Pagina > 0) {
                $scope.ShowToast('No encontramos más resultados de esta busqueda, regresaremos a la página anterior.', 'danger');
                $scope.PaginadoAtras();
              }
            }
          } else {
            $scope.Mensaje = Productos.message;
          }
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      TipoCambioFactory.getTipoCambio()
        .success(function (TipoCambio) {
          $scope.TipoCambio = TipoCambio.Dolar;
          $scope.TipoCambioMs = TipoCambio.DolarMS;
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';
          $scope.ShowToast('No pudimos obtener el tipo de cambio, por favor intenta una vez más.', 'danger');
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.init = function () {
      $scope.CheckCookie();

      FabricantesFactory.getFabricantes()
        .success(function (Fabricantes) {
          $scope.selectFabricantes = Fabricantes;
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos cargar la lista de fabricantes, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      TiposProductosFactory.getTiposProductos()
        .success(function (TiposProductos) {
          $scope.selectTiposProductos = TiposProductos;
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos cargar la lista de tipos de productos, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      EmpresasXEmpresasFactory.getClients()
        .success(function (Empresas) {
          $scope.selectEmpresas = Empresas.data;
        })
        .error(function (data, status, headers, config) {
          $scope.ShowToast('No pudimos cargar la información de tus clientes, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      $scope.BuscarProductos.IdProducto = undefined;
      $scope.BuscarProductos.IdFabricante = $scope.BuscarProductos.IdFabricante;
      $scope.BuscarProductos.IdTipoProducto = $scope.BuscarProductos.IdTipoProducto;
      $scope.BuscarProductos.Offset = $scope.Pagina * 6;

      if (BusquedaURL != 'undefined') {
        $scope.BuscarProductos.Busqueda = BusquedaURL;
        $scope.BuscarProducto(false);
      } else {
        $scope.BuscarProductos.Busqueda = undefined;
        $scope.BuscarProducto(false);
      }
    };

    $scope.init();

    $scope.contractSetted = function (producto) {
      if (producto.IdPedidoContrato) {
        producto.IdUsuarioContacto = undefined;
      }
    };

    $scope.revisarProducto = function (Producto) {
      var IdProducto = Producto.IdProducto;
      var IdEmpresaUsuarioFinal = Producto.IdEmpresaUsuarioFinal;
      ProductosFactory.getProductContracts(IdEmpresaUsuarioFinal, IdProducto)
        .success(function (respuesta) {
          if (respuesta.success === 1) {
            Producto.contratos = respuesta.data;
          } else {
            $scope.ShowToast('No pudimos cargar la información de tus contratos, por favor intenta de nuevo más tarde.', 'danger');
          }
        })
        .error(function () {
          $scope.ShowToast('No pudimos cargar la información de tus contratos, por favor intenta de nuevo más tarde.', 'danger');
        });
      UsuariosFactory.getUsuariosContacto(Producto.IdEmpresaUsuarioFinal)
        .success(function (respuesta) {
          if (respuesta.success === 1) {
            Producto.usuariosContacto = respuesta.data;
          } else {
            $scope.ShowToast('No pudimos cargar la información de tus contactos, por favor intenta de nuevo más tarde.', 'danger');
          }
        })
        .error(function () {
          $scope.ShowToast('No pudimos cargar la información de tus contactos, por favor intenta de nuevo más tarde.', 'danger');
        });

      if (Producto.IdTipoProducto === 4 && Producto.IdFabricante === 1) {
        ProductosFactory.postComplementos(Producto)
          .then(function (data) {
            var IdProductoFabricanteExtra = '';

            for (var x = 0; x < data.data.length; x++) {
              IdProductoFabricanteExtra += data.data[x].IdProductoFabricante + '|';
              if (x === data.data.length - 1) {
                IdProductoFabricanteExtra += data.data[x].IdProductoFabricante;
              }
            }

            Producto.IdProductoFabricanteExtra = IdProductoFabricanteExtra;

            PedidoDetallesFactory.postPedidoDetallesAddOns(Producto)
              .success(function (data) {
                $scope.selectProductos = data;
                $scope.Productos.forEach(function (producto) {
                  if (producto.IdProducto === IdProducto) {
                    if ($scope.selectProductos.length === 0) {
                      producto.Mostrar = false;
                      producto.MostrarMensajeP = true;
                      producto.Required = true;
                    } else {
                      producto.Mostrar = true;
                      producto.Required = true;
                      producto.MostrarMensajeP = false;
                    }
                  }
                }, this);
              })
              .error(function (data, status, headers, config) {
                $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
              });
          });
      }
    };

    $scope.CalcularPrecioTotal = function (Precio, Cantidad, MonedaPago, MonedaProducto, TipoCambio) {
      var total = 0.0;

      if (MonedaPago === 'Pesos' && MonedaProducto === 'Dólares') {
        Precio = Precio * TipoCambio;
      }

      if (MonedaPago === 'Dólares' && MonedaProducto === 'Pesos') {
        Precio = Precio / TipoCambio;
      }

      total = Precio * Cantidad;
      if (!total) { total = 0.00; }
      return total;
    };

    $scope.AgregarCarrito = function (Producto, Cantidad) {
      var NuevoProducto = {
        IdProducto: Producto.IdProducto,
        Cantidad: Cantidad,
        IdEmpresaUsuarioFinal: Producto.IdEmpresaUsuarioFinal,
        MonedaPago: Producto.MonedaPago,
        IdEsquemaRenovacion: Producto.IdEsquemaRenovacion,
        IdFabricante: Producto.IdFabricante,
        CodigoPromocion: Producto.CodigoPromocion,
        ResultadoFabricante2: Producto.IdProductoPadre,
        Especializacion: Producto.Especializacion,
        IdUsuarioContacto: Producto.IdUsuarioContacto
      };
      if (!Producto.IdUsuarioContacto && Producto.IdFabricante === 2) {
        const contrato = Producto.contratos
          .filter(p => p.IdPedido === Producto.IdPedidoContrato)[0].ResultadoFabricante6;
        NuevoProducto.ContratoBaseAutodesk = contrato;
        NuevoProducto.IdAccionAutodesk = Producto.IdAccionProductoAutodesk === 1 ? 3 : 2;
      } else if (Producto.IdUsuarioContacto) {
        NuevoProducto.IdAccionAutodesk = 1;
      }
      console.log(NuevoProducto);
      PedidoDetallesFactory.postPedidoDetalle(NuevoProducto)
        .success(function (PedidoDetalleResult) {
          if (PedidoDetalleResult.success === 1) {
            if (NuevoProducto.IdFabricante === 2 && Producto.Accion === 'asiento') {
              ProductosFactory.getBaseSubscription(NuevoProducto.IdProducto)
                .then(function (result) {
                  $scope.suscripciones = result.data.data;
                  if (result.data.data.length >= 1) {
                    $location.path("/autodesk/productos/" + NuevoProducto.IdProducto + "/detalle/" + PedidoDetalleResult.data.insertId);
                  }
                })
                .catch(console.log);
            }
            $scope.ShowToast(PedidoDetalleResult.message, 'success');
            $scope.ActualizarMenu();
            $scope.addPulseCart();
            setTimeout($scope.removePulseCart, 9000);
          } else {
            $scope.ShowToast(PedidoDetalleResult.message, 'danger');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos agregar este producto a tu carrito de compras, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.AgregarGuardados = function (IdProductoSeleccionado) {
      var ProductoGuardado = { IdProducto: IdProductoSeleccionado };
      ProductoGuardadosFactory.postProductoGuardado(ProductoGuardado)
        .success(function (PedidoDetalleResult) {
          if (PedidoDetalleResult[0].Success == true) {
            $scope.ShowToast(PedidoDetalleResult[0].Message, 'success');
          } else {
            $scope.ShowToast(PedidoDetalleResult[0].Message, 'danger');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos contectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No se pudo agregar este producto en la lista, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.OrdenarPor = function (Atributo) {
      $scope.sortBy = Atributo;
      $scope.reverse = !$scope.reverse;
    };

    $scope.scrollTo = function (eID) {
      var startY = currentYPosition();
      var stopY = elmYPosition(eID);
      var distance = stopY > startY ? stopY - startY : startY - stopY;

      if (distance < 100) {
        scrollTo(0, stopY); return;
      }

      var speed = Math.round(distance / 100);
      if (speed >= 20) speed = 20;
      var step = Math.round(distance / 25);
      var leapY = stopY > startY ? startY + step : startY - step;
      var timer = 0;

      if (stopY > startY) {
        for (var i = startY; i < stopY; i += step) {
          setTimeout('window.scrollTo(0, ' + leapY + ')', timer * speed);
          leapY += step; if (leapY > stopY) leapY = stopY; timer++;
        } return;
      }

      for (var i = startY; i > stopY; i -= step) {
        setTimeout('window.scrollTo(0, ' + leapY + ')', timer * speed);
        leapY -= step; if (leapY < stopY) leapY = stopY; timer++;
      }

      function currentYPosition() {
        if (self.pageYOffset) return self.pageYOffset;

        if (document.documentElement && document.documentElement.scrollTop)
          return document.documentElement.scrollTop;

        if (document.body.scrollTop) return document.body.scrollTop;
        return 0;
      }

      function elmYPosition(eID) {
        var elm = document.getElementById(eID);
        var y = elm.offsetTop;
        var node = elm;
        while (node.offsetParent && node.offsetParent != document.body) {
          node = node.offsetParent;
          y += node.offsetTop;
        } return y;
      }
    };

    $scope.PaginadoInicio = function () {
      $scope.BuscarProducto(true);

      $scope.scrollTo('TopPage');
    };

    $scope.PaginadoAtras = function () {
      $scope.Pagina = $scope.Pagina - 1;
      $scope.BuscarProductos.Offset = $scope.Pagina * 6;
      $scope.BuscarProducto(false);

      $scope.scrollTo('TopPage');
    };

    $scope.PaginadoSiguiente = function () {
      $scope.Pagina = $scope.Pagina + 1;
      $scope.BuscarProductos.Offset = $scope.Pagina * 6;
      $scope.BuscarProducto(false);

      $scope.scrollTo('TopPage');
    };

    $scope.IniciarTourProducts = function () {
      $scope.Tour = new Tour({

        steps: [
          {
            element: '.filterOption',
            placement: 'bottom',
            title: 'Filtra por fabricante',
            content: 'Puedes filtrar tu búsqueda por fabricante o marca para ser más preciso.',
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>",
          },
          {
            element: '.typeOptions',
            placement: 'bottom',
            title: 'Filtra por un tipo de producto',
            content: 'Puedes hacer un filtrado por los tipos de producto que requieras; suscripción o complementos.',
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>",
          },
          {
            element: '.favoriteOption',
            placement: 'left',
            title: 'Agregar a favoritos',
            content: 'Al agregar un producto a favoritos se guardará en tu lista de favoritos que podrás consultar en la parte superior derecha de la pagina, en el menú del carrito de compras.',
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>",
          },
          {
            element: '.ufs',
            placement: 'bottom',
            title: 'Selecciona el cliente',
            content: 'Una vez establecida la cantidad, selecciona a que usuario final va destinado este producto.',
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>",
          },
          {
            element: '.addOption',
            placement: 'bottom',
            title: 'Agregar al carrito',
            content: 'Una vez configurado tu producto, agregalo al carrito de compras.',
            template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='prev'>« Atrás</button><button class='btn btn-default' data-role='next'>Sig »</button><button class='btn btn-default' data-role='end'>Finalizar</button></nav></div></div>",
          },

        ],

        backdrop: true,
        storage: false,
      });

      $scope.Tour.init();
      $scope.Tour.start();
    };
  };

  ProductosReadController.$inject = ['$scope', '$log', '$location', '$cookieStore', '$routeParams', 'ProductosFactory', 'FabricantesFactory', 'TiposProductosFactory', 'PedidoDetallesFactory', 'TipoCambioFactory', 'ProductoGuardadosFactory', 'EmpresasXEmpresasFactory', 'UsuariosFactory', '$anchorScroll'];

  angular.module('marketplace').controller('ProductosReadController', ProductosReadController);
}());
