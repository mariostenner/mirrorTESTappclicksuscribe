(function () {
  var MonitorPagos = function ($scope, $log, $rootScope, $cookies, $location, $uibModal, $filter, PedidoDetallesFactory, EmpresasFactory, PedidosFactory) {
    $scope.PedidoSeleccionado = 0;
    $scope.PedidosSeleccionadosParaPagar = [];
    $scope.PedidosSeleccionadosParaPagarPrepaid = [];
    $scope.PedidosObj = {};
    $scope.ServicioElectronico = 0;
    $scope.Distribuidor = {};
    $scope.Subtotal = 0;
    $scope.Iva = 0;
    $scope.Total = 0;
    $scope.DeshabilitarPagar = false;
    $scope.todos = 0;
    $scope.paymethod = 1;
    $scope.creditCardType = 0;
    let creditCardName = '';
    const ccVisaMcLength = 16;
    const ccAmexLength = 15;
    const ccLengthNameMin = 5;
    const ccLengthNameMax = 80;
    const paymentMethods = {
      CREDIT_CARD: 1,
      CS_CREDIT: 2,
      PAYPAL: 3,
      PREPAY: 4,
      SPEI: 5
    };
    $scope.Pesos = 'MXN';
    $scope.MonitorSpei = 'Monitor';
    const creditCardNames = {
      VISA: 'Visa',
      MASTERCARD: 'Mastercard',
      AMEX: 'American Express'
    };
    const creditCardTypes = {
      VISA: 1,
      MASTERCARD: 1,
      AMEX: 2,
      OTRO: 3
    };
    let deviceSessionId = '';
    let tokenId = '';
    $scope.meses = [{ nombre: 'Enero', valor: '01' }, { nombre: 'Febrero', valor: '02' }, { nombre: 'Marzo', valor: '03' }, { nombre: 'Abril', valor: '04' }, { nombre: 'Mayo', valor: '05' }, { nombre: 'Junio', valor: '06' }, { nombre: 'Julio', valor: '07' }, { nombre: 'Agosto', valor: '08' }, { nombre: 'Septiembre', valor: '09' }, { nombre: 'Octubre', valor: '10' }, { nombre: 'Noviembre', valor: '11' }, { nombre: 'Diciembre', valor: '12' }];
    const getCardError = (errorCode) => {
      switch (errorCode) {
        case 1001:
          return 'El número de tarjeta debería de tener 3 dígitos (4 si es American Express).';
        case 2004:
          return 'El número de tarjeta es inválido.';
        case 2005:
          return 'La fecha de expiración de la tarjeta es anterior a la fecha actual.';
        case 2006:
          return 'El código de seguridad de la tarjeta (CVV2) no fue proporcionado.';
        case 2007:
          return 'El número de tarjeta es de prueba, solamente puede usarse en Sandbox.';
        case 2008:
          return 'La tarjeta no es valida para pago con puntos.';
        case 2009:
          return 'El código de seguridad de la tarjeta (CVV2) es inválido.';
        case 2010:
          return 'Autenticación 3D Secure fallida.';
        case 2011:
          return 'Tipo de tarjeta no soportada.';
        case 3001:
          return 'La tarjeta fue declinada por el banco.';
        case 3002:
          return 'La tarjeta ha expirado.';
        case 3003:
          return 'La tarjeta no tiene fondos suficientes.';
        case 3004:
          return 'La tarjeta ha sido rechazada.';
        case 3005:
          return 'La tarjeta ha sido rechazada por el sistema antifraude.';
        case 3006:
          return 'La operación no esta permitida para este cliente o esta transacción.';
        case 3009:
          return 'La tarjeta fue reportada como perdida.';
        case 3010:
          return 'El banco ha restringido la tarjeta.';
        case 3011:
          return 'El banco ha solicitado que la tarjeta sea retenida. Contacte al banco.';
        case 3012:
          return 'Se requiere solicitar al banco autorización para realizar este pago.';
        case 3201:
          return 'Comercio no autorizado para procesar pago a meses sin intereses.';
        case 3203:
          return 'Promoción no valida para este tipo de tarjetas.';
        case 3204:
          return 'El monto de la transacción es menor al mínimo permitido para la promoción.';
        case 3205:
          return 'Promoción no permitida.';
        case 4013:
          return 'El monto de transacción está fuera de los límites permitidos.';
        default:
          return 'Ocurrió un error, contactar a soporte.';
      }
    };

    const setCCDates = () => {
      const dateCC = new Date();
      let yearNow = parseInt(dateCC.getFullYear().toString().substr(-2));
      let yearMax = yearNow + 10;
      $scope.anios = [];
      for (yearNow; yearNow <= yearMax; yearNow++) {
        $scope.anios.push(yearNow);
      }
    };

    function groupBy (array, f) {
      var groups = {};
      array.forEach(function (o) {
        var group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
      });
      return Object.keys(groups).map(function (group) { return groups[group]; });
    };

    const confirmPayPal = function () {
      const paymentId = $location.search().paymentId;
      const token = $location.search().token;
      const PayerID = $location.search().PayerID;
      const orderIds = $cookies.getObject('orderIds');
      $cookies.remove('orderIds');
      $location.url($location.path());
      if (paymentId && token && PayerID && orderIds) {
        PedidoDetallesFactory.confirmPayPal({ paymentId, PayerID, orderIds })
          .then(function (response) {
            if (response.data.state === 'approved') {
              $scope.ComprarConPayPal({ paymentId, PayerID, orderIds });
              $location.path('/MonitorPagos');
            }
            if (response.data.state === 'failed') {
              $scope.ShowToast('Ocurrió un error al intentar confirmar la compra con Paypal. Intentalo más tarde.', 'danger');
              $location.path('/MonitorPagos');
            }
          })
          .catch(function (response) {
            $scope.ShowToast('Ocurrió un error de tipo: "' + response.data.message + '". Contacte con soporte de Compusoluciones.', 'danger');
            $location.path('/MonitorPagos');
          });
      }
    };

    $scope.modalTdcPagado = function () {
      let modalPagoMonitor = document.getElementById('modalTdcpagado');
      modalPagoMonitor.style.display = 'block';
    };

    $scope.recargarMonitor = () => {
      location.reload();
    };

    $scope.init = function () {
      var dateNow = new Date();
      var hour = dateNow.getHours();
      if (hour >= 16) {
        let disableSPEI = document.getElementById('monitorSpei');
        disableSPEI.style.display = 'none';
      }
      if ($scope.currentPath === '/MonitorPagos') {
        $scope.CheckCookie();
        confirmPayPal();
        $scope.Distribuidor.MonedaPago = 'Pesos';
      }
      $location.path('/MonitorPagos');
      PedidoDetallesFactory.getPendingOrdersToPay()
        .success(function (ordersToPay) {
          $scope.Pedidos = ordersToPay.data;
          if (!ordersToPay.data || ordersToPay.data.length === 0) {
            return $scope.DeshabilitarPagar = true;
          }
          $scope.PedidosAgrupados = groupBy(ordersToPay.data, function (item) { return [item.IdPedido]; });
          for (let x = 0; x < $scope.PedidosAgrupados.length; x++) {
            $scope.PedidosObj[$scope.PedidosAgrupados[x][0].IdPedido] = $scope.PedidosAgrupados[x][0];
          }
          $scope.TipoCambio = ordersToPay.data[0].TipoCambio;
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos cargar los pedidos por pagar, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      if ($cookies.getObject('Session').IdTipoAcceso == 2 || $cookies.getObject('Session').IdTipoAcceso == 3) {
        EmpresasFactory.getEmpresa($cookies.getObject('Session').IdEmpresa)
          .success(function (empresa) {
            $scope.infoEmpresa = empresa[0];
          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';

            $scope.ShowToast('No pudimos cargar la información, por favor intenta de nuevo más tarde.', 'danger');

            $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
          });
      }
      $cookies.remove('tipoTarjetaCreditoMonitor');
      let deshabilitarTc = document.getElementById('deshabilitarTc');
      if (document.getElementById('Tarjeta').checked) {
        deshabilitarTc.style.display = 'none';
        $('#btnSiguiente').prop('disabled', true);
      } else {
        $('#btnSiguiente').prop('disabled', false);
        deshabilitarTc.style.display = 'block';
      }
    };

    $scope.init();

    $scope.isPayingWithCreditCard = function () {
      const IdFormaPago = $scope.paymethod;
      return IdFormaPago === paymentMethods.CREDIT_CARD;
    };

    $scope.isPayingWithPaypal = function () {
      const IdFormaPago = $scope.paymethod;
      return IdFormaPago === paymentMethods.PAYPAL;
    };

    $scope.isPayingWithPrepaid = function () {
      const IdFormaPago = $scope.paymethod;
      return IdFormaPago === paymentMethods.PREPAY;
    };

    $scope.isPayingWithSpei = function () {
      const IdFormaPago = $scope.paymethod;
      return IdFormaPago === paymentMethods.SPEI;
    };

    const limpiarPedido = () => {
      for (var x = 0; x < $scope.PedidosAgrupados.length; x++) {
        $scope.PedidosObj[$scope.PedidosAgrupados[x][0].IdPedido].Check = false;
        $scope.pedidosPorPagar($scope.PedidosAgrupados[x][0].IdPedido);
      }
      $scope.PedidosSeleccionadosParaPagar = [];
      $scope.ServicioElectronico = 0;
      $scope.Subtotal = 0;
      $scope.Iva = 0;
      $scope.Total = 0;
    };

    $scope.ActualizarFormaPago = function (moneda) {
      let deshabilitarTc = document.getElementById('deshabilitarTc');
      limpiarPedido();
      $scope.paymethod = moneda;
      if ($scope.isPayingWithCreditCard() || $scope.isPayingWithPaypal()) {
        $scope.Distribuidor.MonedaPago = 'Pesos';
      }
      if (moneda !== paymentMethods.CREDIT_CARD) {
        $('#btnSiguiente').prop('disabled', false);
        deshabilitarTc.style.display = 'block';
      } else {
        if (document.getElementById('Tarjeta').checked && !$cookies.getObject('tipoTarjetaCreditoMonitor')) {
          deshabilitarTc.style.display = 'none';
          $('#btnSiguiente').prop('disabled', true);
        } else {
          deshabilitarTc.style.display = 'block';
          $('#btnSiguiente').prop('disabled', false);
        }
      }
      CambiarMoneda();
    };

    $scope.tipoTarjetaMonitor = (tipo) => {
      let deshabilitarTc = document.getElementById('deshabilitarTc');
      $cookies.putObject('tipoTarjetaCreditoMonitor', tipo);
      tipo === 1 ? creditCardName = 'Visa/Mastercard' : creditCardName = 'American Express';
      $('#btnSiguiente').prop('disabled', false);
      deshabilitarTc.style.display = 'block';
      limpiarPedido();
    };

    $scope.CambiarMoneda = CambiarMoneda;

    $scope.cambiaMoneda = function (tipoMoneda, key) {
      $scope.Distribuidor.MonedaPago = tipoMoneda || 'Pesos';
      $scope.pedidosPorPagar(key);
    };

    var CambiarMoneda = function (tipoMoneda, key) {
      $scope.Distribuidor.MonedaPago = tipoMoneda || 'Pesos';
      const MonedaPago = $scope.Distribuidor.MonedaPago;
      $scope.pedidosPorPagar(key);
      EmpresasFactory.putCambiaMonedaMonitorPXP($scope.PedidosSeleccionadosParaPagar, MonedaPago)
        .then(function (result) {
        })
        .catch(function (result) { error(result.data); });
    };

    $scope.ActualizarPagoAutomatico = function () {
      EmpresasFactory.updateAutomaticPayment($scope.infoEmpresa.RealizarCargoAutomatico)
        .success(function (result) {
          if (result.success === 1) {
            $scope.ShowToast(result.message, 'success');
          }
        })
        .error(function (data, status, headers, config) {
          $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';

          $scope.ShowToast('No pudimos cargar la información, por favor intenta de nuevo más tarde.', 'danger');

          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.obtenerSubTotal = function (key) {
      var subtotal = 0;
      for (var x = 0; x < $scope.Pedidos.length; x++) {
        if ($scope.Pedidos[x].IdPedido == key) {
          subtotal += $scope.Pedidos[x].PrecioRenovacion * $scope.Pedidos[x].CantidadProxima * $scope.Pedidos[x].TipoCambio;
        }
      }
      return subtotal;
    };

    $scope.seleccionarTodos = function () {
      for (var x = 0; x < $scope.PedidosAgrupados.length; x++) {
        if ($scope.PedidosObj[$scope.PedidosAgrupados[x][0].IdPedido].Check !== $scope.todos) {
          $scope.PedidosObj[$scope.PedidosAgrupados[x][0].IdPedido].Check = $scope.todos;
          $scope.pedidosPorPagar($scope.PedidosAgrupados[x][0].IdPedido);
        }
      }
    };

    $scope.pedidosPorPagar = function (key) {
      for (var y = 0; y < $scope.Pedidos.length; y++) {
        if ($scope.Pedidos[y].IdPedido == key) {
          if (!$scope.PedidosObj[key].Check) {
            if ($scope.todos) {
              $scope.todos = 0;
            }
            for (var x = 0; x < $scope.PedidosSeleccionadosParaPagar.length; x++) {
              if (key == $scope.PedidosSeleccionadosParaPagar[x]) {
                $scope.PedidosSeleccionadosParaPagar.splice(x, 1);
                $scope.PedidosSeleccionadosParaPagarPrepaid.splice(x, 1);
              }
            }
            $scope.Pedidos[y].Seleccionado = 0;
          } else {
            const pedido = {
              IdPedido: key,
              TipoCambio: $scope.Pedidos[y].TipoCambio,
            };
            $scope.PedidosSeleccionadosParaPagar.push(key);
            $scope.PedidosSeleccionadosParaPagarPrepaid.push(pedido);
            $scope.Pedidos[y].Seleccionado = 1;
          }
          break;
        }
      }
      if ($scope.PedidosSeleccionadosParaPagar.length === 0) {
        $scope.PedidosSeleccionadosParaPagar = [];
        $scope.ServicioElectronico = 0;
        $scope.Subtotal = 0;
        $scope.Iva = 0;
        $scope.Total = 0;
      }
      if ($scope.PedidosSeleccionadosParaPagar.length !== 0 && document.getElementById('Prepago').checked) {
        PedidoDetallesFactory.monitorCalculationsPrepaid({Pedidos: $scope.PedidosSeleccionadosParaPagar, tipoTarjeta: false}, $scope.Distribuidor.MonedaPago)
          .success(function (calculations) {
            if (calculations.OrderTotal) {
              $scope.Subtotal = calculations.totalCharges[0].subtotalOrders;
              $scope.Iva = calculations.totalCharges[0].ivaOrders;
              $scope.Total = calculations.totalCharges[0].totalOrders;
            } else {
              $scope.Subtotal = 0;
              $scope.Iva = 0;
              $scope.Total = 0;
            }
            $scope.ServicioElectronico = 0;
          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';
            $scope.ShowToast('No pudimos realizar los cálculos, por favor intenta de nuevo más tarde.', 'danger');
          });
      }
      if ($scope.PedidosSeleccionadosParaPagar.length !== 0 && document.getElementById('Spei').checked) {
        PedidoDetallesFactory.monitorCalculationsPrepaid({Pedidos: $scope.PedidosSeleccionadosParaPagar, tipoTarjeta: false}, $scope.Distribuidor.MonedaPago)
          .success(function (calculations) {
            if (calculations.OrderTotal) {
              $scope.Subtotal = calculations.totalCharges[0].subtotalOrders;
              $scope.Iva = calculations.totalCharges[0].ivaOrders;
              $scope.Total = calculations.totalCharges[0].totalOrders;
            } else {
              $scope.Subtotal = 0;
              $scope.Iva = 0;
              $scope.Total = 0;
            }
            $scope.ServicioElectronico = 0;
          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';
            $scope.ShowToast('No pudimos realizar los cálculos, por favor intenta de nuevo más tarde.', 'danger');
          });
      }
      if ($scope.PedidosSeleccionadosParaPagar.length !== 0 && document.getElementById('Tarjeta').checked) {
        if ($cookies.getObject('tipoTarjetaCreditoMonitor') && $scope.PedidosSeleccionadosParaPagar.length !== 0) {
          let tipoTarjeta = $cookies.getObject('tipoTarjetaCreditoMonitor');
          PedidoDetallesFactory.monitorCalculations({Pedidos: $scope.PedidosSeleccionadosParaPagar, tipoTarjeta})
          .success(function (calculations) {
            if (calculations.OrderTotal) {
              $scope.ServicioElectronico = calculations.totalCharges[0].electronicServiceTotal;
              $scope.Subtotal = calculations.totalCharges[0].subtotalOrders;
              $scope.Iva = calculations.totalCharges[0].ivaOrders;
              $scope.Total = calculations.totalCharges[0].totalOrders;
            } else {
              $scope.ServicioElectronico = 0;
              $scope.Subtotal = 0;
              $scope.Iva = 0;
              $scope.Total = 0;
            }
          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';

            $scope.ShowToast('No pudimos realizar los cálculos, por favor intenta de nuevo más tarde.', 'danger');

            $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
          });
        } else {
          $scope.ShowToast('Selecciona el tipo de tarjeta con la que quieres pagar.', 'danger');
        }
      }
    };

    $scope.mostrarDetalles = function (key) {
      if ($scope.PedidosObj[key].Mostrar) {
        $scope.PedidosObj[key].Mostrar = 0;
      } else {
        $scope.PedidosObj[key].Mostrar = 1;
      }
    };

    $scope.checkPayment = function () {
      if (document.getElementById('Tarjeta').checked) {
        $scope.pagar();
      } else if (document.getElementById('Prepago').checked) {
        $scope.preparePrePaid();
      } else if (document.getElementById('Spei').checked) {
        $scope.pagarSPEI();
      }
    };

    $scope.abreModal = function () {
      let modalPagoMonitor = document.getElementById('modalPagoMonitor');
      modalPagoMonitor.style.display = 'block';
    };

    $scope.pagarSPEI = function () {
      if ($scope.PedidosSeleccionadosParaPagar.length > 0) {


        PedidoDetallesFactory.monitorCalculationsPrepaid({Pedidos: $scope.PedidosSeleccionadosParaPagar, tipoTarjeta: false}, $scope.Distribuidor.MonedaPago)
          .success(function (calculations) {
            OpenPay.setId(calculations.totalCharges['0'].opId);
            OpenPay.setApiKey(calculations.totalCharges['0'].opPublic);
            OpenPay.setSandboxMode(false);
            const PedidosSeleccionadosParaPagar = $scope.PedidosSeleccionadosParaPagar.map(function(IdPedido){
                return {'IdPedido':IdPedido};
            });
            const charges = {
              amount: parseFloat($scope.Total.toFixed(2)),
              currency: $scope.Pesos,
              description: `${$scope.MonitorSpei}: ${$scope.PedidosSeleccionadosParaPagar.toString()}`,
              pedidosAgrupados: PedidosSeleccionadosParaPagar,
              idCarrito: `${$scope.PedidosSeleccionadosParaPagar[0]}-${Date.now()}`,
              from: $scope.MonitorSpei
            };
            PedidoDetallesFactory.getgenerarPdfSPEI(charges)
              .success(function (pdfRes) {
                let deshabilitarTc = document.getElementById('deshabilitarTc');
                deshabilitarTc.style.display = 'none';
                date = new Date(pdfRes.fechaCreacion);
                const dateSpei = new Date(pdfRes.fechaCreacion).getFullYear()+'-' + (date.getMonth()+1) + '-'+date.getDate();
                const timeSpei = new Date(date).toLocaleTimeString();
                let amount = $scope.Total.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                let monitorPdfSPEI = document.getElementById('pdfSPEIMonitor');
                monitorPdfSPEI.style.display = 'block';
                monitorPdfSPEI.innerHTML = `
                      <div class="row tituloSpei text-center">
                        <div class="alert alert-warning" role="alert">
                            <b>Importante*</b> <br>
                            *Los pedidos seguirán estando visibles hasta que se complete la transferencia.
                        </div>
                        <h2>Información de pago (SPEI)</h2>
                      </div>
                  <div class="row pt-5">
                      <div class="col-sm-6">
                          <p>
                            <b>Fecha y Hora:</b>
                            <br>
                            <span>${dateSpei} ${timeSpei}</span>
                          </p>
              
                          <p>
                              <b>Descripción de compra:</b>
                              <br>
                              <span>${pdfRes.descripcion}</span>
                          </p>
                      </div>
                      
                      <div class="col-sm-6 text-center montoSpei">
                          <div class="total">
                              <p><b>Total a pagar / MXN</b></p>
                              <span class="montoTotalSpei">$ ${amount}</span>
                          </div>
                      </div>
                  </div>
                  <div class="row">
                      <p>
                          <h3 class="specialBlueText"><b>Como pagar</b></h3>
                      </p>
  
                      <div class="col-sm-6">
                          <p><b>Desde BBVA</b></p>
                          <p>
                              1. Dentro del menú de "Pagar" seleccione la opción
                              "De Servicios" e ingrese el siguiente "Número de
                              convenio CIE"
                          </p>
                          <p>
                              <b>Número de convenio CIE:</b> <span>${pdfRes.payment_method.agreement}</span>
                          </p>
                          <p>
                              2. Ingrese los datos de registro para concluir con la operación
                          </p>
                          <p>
                              <b>Referencia:</b> <span>${pdfRes.payment_method.name}</span>
                          </p>
                          <p>
                              <b>Importe:</b> <span>$ ${amount} ${pdfRes.moneda}</span>
                          </p>
                          <p>
                              <b>Concepto:</b> <span>${pdfRes.descripcion}</span>
                          </p>
                      </div>
  
                      <div class="col-sm-6 pagoNormal">
                          <p><b>Desde cualquier otro banco</b></p>
                          <p>
                              1. Ingresa a la sección de transferencias y pagos o
                              pagos a otros bancos y proporciona los datos de
                              la transferencia:
                          </p>
                          <p>
                              <b>Beneficiario:</b> <span>Click suscribe</span>
                          </p>
                          <p>
                              <b>Banco destino:</b> <span>BBVA Bancomer</span>
                          </p>
                          <p>
                              <b>Clabe:</b> <span>${pdfRes.payment_method.clabe}</span>
                          </p>
                          <p>
                              <b>Concepto de pago:</b> <span>${pdfRes.payment_method.name}</span>
                          </p>
                          <p>
                              <b>Referencia:</b> <span>${pdfRes.payment_method.agreement}</span>
                          </p>
                          <p>
                              <b>Importe:</b> <span>$${amount} ${pdfRes.moneda}</span>
                          </p>
                      </div>
                  </div><!--
                  <div class="row pt-5">
                      <span class="avisoInfo">
                          <i>Si tienes dudas comunicate a pruebas openpay al teléfono (331) 281-5145 o al correo pruebas.openpaycs@gmail.com</i>
                      </span>
                  </div>-->
                  <div class="row text-center pt-5 mt-5">
                      <p class="text-success">
                          <i>Para guardar el formato en PDF da click en el boton "Generar PDF", donde se abrirá una nueva ventana para su impresión o descarga.</i>
                      </p>
                      <button type="button" onclick="window.open('${pdfRes.ligaPDF}', 'Descargar_Comprobante_de_Pago')" class="btn btn-success btnRounded mt-0">Generar PDF</button>
                  </div>`;
                document.getElementById('btnSiguiente').style.display = 'none';
              })
              .error(function (data, status, headers, config) {
                const error = !data.message ? 'Ocurrió un error al procesar la solicitud. Intentalo de nuevo.' : data.message;
                $scope.ShowToast(error, 'danger');
              });

          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';
            $scope.ShowToast('No pudimos realizar los cálculos, por favor intenta de nuevo más tarde.', 'danger');
          });
      } else {
        $scope.ShowToast('Selecciona al menos un pedido para pagar.', 'danger');
      }
    };

    $scope.pagar = function () {
      if ($scope.PedidosSeleccionadosParaPagar.length > 0) {
        let tipoTarjeta = $cookies.getObject('tipoTarjetaCreditoMonitor');
        PedidoDetallesFactory.payWidthCard({ Pedidos: $scope.PedidosSeleccionadosParaPagar, tipoTarjeta })
          .success(function (Datos) {
            var expireDate = new Date();
            expireDate.setTime(expireDate.getTime() + 600 * 2000);
            Datos.data.pedidosAgrupados[0].TipoCambio = $scope.TipoCambio;
            $cookies.putObject('pedidosAgrupados', Datos.data.pedidosAgrupados, { 'expires': expireDate, secure: $rootScope.secureCookie });
            if (Datos.success) {
              if ($cookies.getObject('pedidosAgrupados')) {
                setCCDates();
                $scope.pedidos = Datos.data.pedidos;
                $scope.amount = $scope.Total.toFixed(2);
                $scope.FormatedAmountMonitor = String($scope.amount).replace(/(?<!\..*)(\d)(?=(?:\d{3})+(?:\.|$))/g, '$1,');
                $scope.currency = Datos.data.moneda;
                OpenPay.setId(Datos.data.opId);
                OpenPay.setApiKey(Datos.data.opPublic);
                OpenPay.setSandboxMode(false);
                deviceSessionId = OpenPay.deviceData.setup('payment-form-monitor', 'deviceIdHiddenFieldName');
                $('#deviceSessionId').val(deviceSessionId);
                $scope.abreModal();
              }
            }
          })
          .error(function (data, status, headers, config) {
            $scope.Mensaje = 'No pudimos conectarnos a la base de datos, por favor intenta de nuevo más tarde.';

            $scope.ShowToast('No pudimos conectarnos con el banco, por favor intenta de nuevo más tarde.', 'danger');

            $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
          });
      } else {
        $scope.ShowToast('Selecciona al menos un pedido para pagar.', 'danger');
      }
    };

    $('#payButton').on('click', function (event) {
      const creditCardNumber = document.getElementById('cardNumber').value;
      const creditCardFormated = creditCardNumber.split(' ').join('');
      const holderName = document.getElementById('cardName').value;
      let holderNameFormated = holderName.replace(/  +/g, ' ');
      if (holderNameFormated[0] == ' ') holderNameFormated = holderNameFormated.substring(1);
      const ccexpmonth = document.getElementById('ccexpmonthMonitor').value;
      const ccexpyear = document.getElementById('ccexpyearMonitor').value;
      const cvv = document.getElementById('cvvMonitor').value;
      const cardType = OpenPay.card.cardType(creditCardFormated);
      document.getElementById('cardName').value = holderNameFormated;
      switch (cardType) {
        case creditCardNames.VISA:
          $scope.creditCardType = creditCardTypes.VISA;
          break;
        case creditCardNames.MASTERCARD:
          $scope.creditCardType = creditCardTypes.MASTERCARD;
          break;
        case creditCardNames.AMEX:
          $scope.creditCardType = creditCardTypes.AMEX;
          break;
        default:
          $scope.creditCardType = creditCardTypes.OTRO;
      }

      const validateCreditCard = () => {
        event.preventDefault();
        $('#payButton').prop('disabled', true);
        OpenPay.token.create({
          'card_number': creditCardFormated,
          'holder_name': holderNameFormated,
          'expiration_year': ccexpyear,
          'expiration_month': ccexpmonth,
          'cvv2': cvv
        }, successCallbak, errorCallbak);
      };

      if (holderName.replace(/ /g, '').length < ccLengthNameMin) {
        printError('El nombre del titular debe contar con 5 o más caracteres.');
      } else {
        if (holderName.replace(/ /g, '').length > ccLengthNameMax) {
          printError('El nombre del titular es demasiado largo (máximo 80 caracteres).');
        } else {
          if (creditCardFormated.replace(/ /g, '').length !== ccVisaMcLength && creditCardFormated.trim().length !== ccAmexLength) {
            printError(`Los dígitos de tu tarjeta <b>${creditCardName}</b> están incompletos, verificalos.`);
          } else {
            if ($scope.creditCardType !== $cookies.getObject('tipoTarjetaCreditoMonitor')) {
              printError(`El tipo de tarjeta no es válido y no concuerda con el tipo seleccionado anteriormente (<b>${creditCardName}</b>), favor de actualizar tu información.`);
            } else {
              if ($scope.creditCardType === creditCardTypes.VISA || $scope.creditCardType === creditCardTypes.MASTERCARD) {
                if (creditCardFormated.length !== ccVisaMcLength) {
                  printError(`El tipo de tarjetas <b>${cardType}</b> debería contar con 16 dígitos.`);
                } else {
                  validateCreditCard();
                }
              } else if ($scope.creditCardType === creditCardTypes.AMEX) {
                if (creditCardFormated.length !== ccAmexLength) {
                  printError(`El tipo de tarjetas <b>${cardType}</b> debería contar con 15 dígitos.`);
                } else {
                  validateCreditCard();
                }
              }
            }
          }
        }
      }
    });

    const successCallbak = function (response) {
      $('#responseDivMonitor').html('').addClass('ocultar').removeClass('alert alert-danger');
      tokenId = response.data.id;
      $('#tokenId').val(tokenId);
      const desctriptionOrders = $cookies.getObject('pedidosAgrupados').map(function (pedido) {
        return pedido.IdPedido;
      });
      const charges = {
        source_id: tokenId,
        amount: $scope.amount,
        currency: $scope.currency,
        description: `(${$cookies.getObject('tipoTarjetaCreditoMonitor')})Monitor: ${desctriptionOrders.toString()}`,
        device_session_id: deviceSessionId,
        pedidosAgrupados: $cookies.getObject('pedidosAgrupados')
      };
      PedidoDetallesFactory.pagarTarjetaOpenpay(charges)
        .then(function (response) {
          if (response.data.statusCode === 200) {
            if (response.data.content.statusCharge == 'charge_pending') {
              $cookies.remove('paymentId');
              $cookies.putObject('paymentId', response.data.content.paymentId);
              window.location.href = response.data.content.redirect_url;
            } else {
              angular.element(document.getElementById('divComprar')).scope().CreditCardPayment(response.data.content.statusCharge, response.data.content.paymentId);
              $scope.cerrarModal('modalPagoMonitor');
            }
          } else {
            printError(response.data.message);
          }
        })
        .catch(function (response) {
          $scope.ShowToast('Ocurrió un error al procesar el pago. de tipo: ' + response.data.message, 'danger');
        });
    };

    $scope.btnTdc = (statusCharge, paymentId) => {
      angular.element(document.getElementById('divComprar')).scope().CreditCardPayment(statusCharge, paymentId);
    };

    const printError = (messageError) => {
      $('#responseDivMonitor').html(messageError).removeClass('ocultar').removeClass().addClass('alert alert-danger');
      $('#payButton').prop('disabled', false);
    };

    const errorCallbak = function (response) {
      let desc = response.data.error_code != undefined ?
        response.data.error_code : response.message;
      printError(getCardError(response.data.error_code));
    };

    $scope.cerrarModal = modal => {
      document.getElementById(modal).style.display = 'none';
    };

    const getActualSubdomain = function () {
      let subdomain = window.location.href;
      subdomain = subdomain.replace('/#/MonitorPagos', '');
      return subdomain;
    };

    $scope.ComprarConPayPal = function (resultPaypal) {
      const paypalNextPayment = $cookies.getObject('paypalNextPayment');
      const TipoCambio = paypalNextPayment.TipoCambio;
      const electronicServiceByOrder = paypalNextPayment.electronicServiceByOrder;
      const PedidosAgrupados = electronicServiceByOrder.map(function (order) {
        return Object.assign({}, order, { TipoCambio });
      });
      const datosPayPal = {
        TarjetaResultIndicator: resultPaypal.paymentId,
        TarjetaSessionVersion: resultPaypal.PayerID,
        PedidosAgrupados
      };
      if (datosPayPal.PedidosAgrupados) {
        PedidosFactory.patchPaymentInformation(datosPayPal)
          .success(function (compra) {
            $cookies.remove('pedidosAgrupados');
            $cookies.remove('TipoCambio');
            $cookies.remove('electronicServiceByOrder');
            if (compra.success === 1) {
              $scope.ShowToast(compra.message, 'success');
              $location.path('/MonitorPagos/refrescar');
            }
          })
          .error(function (data, status, headers, config) {
            $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
          });
      } else {
        $scope.ShowToast('Algo salió mal con tu pedido, por favor ponte en contacto con tu equipo de soporte CompuSoluciones para más información.', 'danger');
        $location.path('/MonitorPagos/e');
      }
    };

    $scope.preparePrePaid = function () {
      if ($scope.PedidosSeleccionadosParaPagar.length > 0) {
        PedidoDetallesFactory.payWithPrePaid({ Pedidos: $scope.PedidosSeleccionadosParaPagarPrepaid }, $scope.Distribuidor.MonedaPago)
          .success(function (response) {
            if (response.statusCode === 400) {
              $scope.ShowToast(response.message, 'danger');
            } else {
              $scope.ShowToast('Pago realizado correctamente.', 'success');
              $location.path('/MonitorPagos/refrescar');
            }
          })
          .catch(function (response) {
            $scope.ShowToast('Algo salió mal con tu pedido, por favor ponte en contacto con tu equipo de soporte CompuSoluciones para más información.', 'danger');
          });
      } else {
        $scope.ShowToast('Selecciona al menos un pedido para pagar.', 'danger');
      }
    };


    let globalNumber = 0;
    let maxlengthNumber = 17;
    function _getcaret(input) {
        if ('selectionStart' in input) {
            return input.selectionStart;
        } else if (document.selection) {
            input.focus();
            let sel = document.selection.createRange();
            let selLen = document.selection.createRange().text.length;
            sel.moveStart('character', -input.value.length);
            return sel.text.length - selLen;
        }
    }
    function _setcaret(input, pos) {
        if (input.setSelectionRange) {
            input.focus()
            input.setSelectionRange(pos, pos)
        } else if (input.createTextRange) {
            let range = input.createTextRange();
            range.move('character', pos);
            range.select();
        }
    }

    function _format_465(cc) {
        return [cc.substring(0, 4), cc.substring(4, 10), cc.substring(10, 15)].join(' ').trim()
    }
    function _format_4444(cc) {
        return cc ? cc.match(/[0-9]{1,4}/g).join(' ') : ''
    }
    _CARD_TYPES = [
        { 'type': 'visa', 'pattern': /^4/, 'format': _format_4444, 'maxlength': 16 },
        { 'type': 'master', 'pattern': /^(5[12345])|(2[2-7])/, 'format': _format_4444, 'maxlength': 16 },
        { 'type': 'amex', 'pattern': /^3[47]/, 'format': _format_465, 'maxlength': 15 },
    ]
    function _format_cardnumber(cc, maxlength) {
        cc = cc.replace(/[^0-9]+/g, '')

        for (let i in _CARD_TYPES) {
            const ct = _CARD_TYPES[i]
            if (cc.match(ct.pattern)) {
                cc = cc.substring(0, ct.maxlength)
                return ct.format(cc)
            }
        }

        return _format_4444(cc)
    }

    function _set_creditcard_number(event) {
        const input = event.target
        const maxlength = input.getAttribute('maxlength')
        let oldval = input.value
        let caret_position = _getcaret(input)
        let before_caret = oldval.substring(0,caret_position)
        before_caret = _format_cardnumber(before_caret)
        caret_position = before_caret.length;
        let newNumber = oldval.replace(/ /g,'');
        if(newNumber.length >= maxlengthNumber) {
            return input.value = globalNumber;
        }else {
            let newvalue = _format_cardnumber(oldval, maxlength);
            globalNumber = newvalue;
            if(oldval==newvalue) return
            input.value = newvalue
            _setcaret(input, caret_position)
        }
    }

    function make_credit_card_input(input) {
        input.addEventListener('input',_set_creditcard_number)
        input.addEventListener('keyup',_set_creditcard_number)
        input.addEventListener('keydown',_set_creditcard_number)
        input.addEventListener('keypress',_set_creditcard_number)
        input.addEventListener('change',_set_creditcard_number)
    }

    make_credit_card_input(document.getElementById("cardNumber"));

  };
  MonitorPagos.$inject = ['$scope', '$log', '$rootScope', '$cookies', '$location', '$uibModal', '$filter', 'PedidoDetallesFactory', 'EmpresasFactory', 'PedidosFactory'];

  angular.module('marketplace').controller('MonitorPagos', MonitorPagos);
}());
