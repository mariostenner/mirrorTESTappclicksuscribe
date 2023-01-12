(function () {
  var MonitorContratosController = function ($scope, $log, $cookies, $location, $uibModal, $filter, MonitorContratosFactory) {
    $scope.vacio = 0;
    $scope.Renovar = {};
    $scope.TradeIn = {};
    $scope.SessionCookie = $cookies.getObject('Session');
    const PREMIUM = 'Premium'

    $scope.init = function () {
      MonitorContratosFactory.getEndCustomer()
        .success(function (Empresas){
          $scope.selectEmpresas = Empresas;
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

    };

    const getContractCustomer = function (customer) {
      MonitorContratosFactory.getContractCustomer(customer)
        .then(function (result) {
          if (result.status === 200) {
            $scope.contracts = result.data.data;
            $scope.contracts.forEach(contract => {
              contract.renovacion = contract.contract_end_date;
              contract.esquemaRenovacion = (contract.contract_term === 'Annual') ? 'Anual' : 'Cada 3 años';
              contract.etiquetaTermSwitch = (contract.contract_term === '3-Year') ? 'Actualizar periodo a un año' : 'Actualizar periodo a tres años';
              contract.subscriptions.forEach(subscription => {
                subscription.MostrarCantidad = false;
                if (subscription.product_line === PREMIUM) subscription.is_premium = true;
                if (!subscription.subs_ready || subscription.siclick_status) contract.termSwitchStatus = true;
                if (subscription.deployment === 'S') {
                  subscription.implantacion = 'Single-user';
                } else if (subscription.deployment === 'N') {
                  subscription.implantacion = 'Multi-user';
                } else if ( subscription.deployment === 'A') {
                  subscription.implantacion = 'Hosted';
                } else {
                  subscription.implantacion = 'Import Subscription';
                }
              });
            });
          }
          if (result.data.data.length > 0) {
            $scope.vacio = 1;
          } else {
            $scope.vacio = 0;
          }
        })
        .catch(function (result) {
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    const getContactUsers = function (customer) {
      MonitorContratosFactory.getUserEndCustomer(customer)
        .then(result => {
          $scope.contactos = result.data.data;
          $scope.renovar = {};
        });
    };

    const renewContract = function (contractData) {
      MonitorContratosFactory.renewContract(contractData)
        .then(result => {
          if (result.data.success) {
            $scope.ShowToast(result.data.message, 'success');
            $scope.ActualizarMenu();
            $scope.addPulseCart();
            setTimeout($scope.removePulseCart, 9000);
            $location.path('/Carrito');
          } else $scope.ShowToast(result.data.message, 'danger');
        })
        .catch(result => {
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    const tradeInContract = function (contractData) {
      MonitorContratosFactory.tradeInContract(contractData)
        .then(result => {
          if (result.data.success) {
            $('#renovacionTradeIn').modal('hide');
            $scope.ShowToast(result.data.message, 'success');
            $scope.ActualizarMenu();
            $scope.addPulseCart();
            setTimeout($scope.removePulseCart, 9000);
            $location.path('/Carrito');
          } else $scope.ShowToast(result.data.message, 'danger');
        })
        .catch(result => {
          $('#renovacionTradeIn').modal('hide');
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    const addLimitExtensionDays = date => {
      const LIMIT_EXTENSION_DAYS = 1095;
      date.setDate(date.getDate() + LIMIT_EXTENSION_DAYS);
      return date;
    };

    const getExtensionDates = (contractEndDate, contracts) => {
      const limitDateInf = new Date(contractEndDate).setDate(new Date(contractEndDate).getDate() + 1);
      const limitDateSup = addLimitExtensionDays(new Date());
      return contracts.map(contract => {
        const currentContractEndDate = new Date(contract.contract_end_date).setDate(new Date(contract.contract_end_date).getDate() + 1);
        if (currentContractEndDate > limitDateInf && currentContractEndDate <= limitDateSup) return { contractNumber: contract.contract_number, endDate: contract.contract_end_date };
      });
    };

    const showExtrensionModal = currentContract => {
      $scope.opcionesExtencion.length > 0 ? $(`#extenderModal${currentContract}`).modal('show')
      : $('#noExtender').modal('show');
    };

    const extendContract = contractData => {
      MonitorContratosFactory.extendContract(contractData)
        .then(result => {
          $(`#extenderModal${contractData.contractNumber}`).modal('hide');
          if (result.data.success) {
            $scope.ShowToast(result.data.message, 'success');
            $scope.ActualizarMenu();
            $scope.addPulseCart();
          } else {
            $scope.ShowToast(result.data.message, 'danger');
          }
        })
        .catch(result => {
          $(`#extenderModal${contractData.contractNumber}`).modal('hide');
          $scope.ShowToast(result.data.message, 'danger');
        });
    };

    $scope.init();

    $scope.ActualizarMonitor = function () {
      let endCustomerCSN = $scope.EmpresaSelect;
      getContractCustomer(endCustomerCSN);
      getContactUsers(endCustomerCSN);
    };

    $scope.AgregarContrato = function (contract) {
      let subscriptionsForRenewal = [];
      contract.subscriptions.forEach(subscription => {
        if (subscription.forRenewal) {
          let {subs_ready, MostrarCantidad, forRenewal, siclick_status, implantacion, ...subscriptionClone} = subscription
          subscriptionsForRenewal.push(subscriptionClone);
        }
      });
      
      if (subscriptionsForRenewal.length <= 0) {
        $scope.Renovar.contrato = '';
        $scope.Renovar.suscripciones = [];
        $scope.ShowToast('Selecciona una serie para renovar', 'warning');
      } else {
        $scope.Renovar.contrato = contract.contract_number;
        $scope.Renovar.suscripciones = subscriptionsForRenewal;
        $('#renovarModal').modal('show');
      }
    };

    $scope.AgregarTradeIn = function (contract){
      let subscriptionsForTradeIn = [];
      contract.subscriptions.forEach(subscription => {
        if (subscription.forRenewal) {
          let {subs_ready, MostrarCantidad, forRenewal, siclick_status, implantacion, ...subscriptionClone} = subscription
          subscriptionsForTradeIn.push(subscriptionClone);
        }
      });

      if (subscriptionsForTradeIn.length <= 0) {
        $scope.TradeIn.contrato = '';
        $scope.TradeIn.suscripciones = [];
        $scope.ShowToast('Selecciona una serie para trade in', 'warning');
      }else if(subscriptionsForTradeIn.some(subscription => subscription.deployment !== 'N')){
        $scope.TradeIn.contrato = '';
        $scope.TradeIn.suscripciones = [];
        $scope.ShowToast('Trade in solo está disponible para series Multi Usuario', 'warning');
      } 
      else if(subscriptionsForTradeIn.some(subscription => !subscription.quantityToUpdate)){
        $scope.TradeIn.contrato = '';
        $scope.TradeIn.suscripciones = [];
        $scope.ShowToast('Recuerda indicar la cantidad de series a utilizar en el trade in', 'warning');
      } 
      else {
        $scope.TradeIn.contrato = contract.contract_number;
        $scope.TradeIn.suscripciones = subscriptionsForTradeIn;
        $('#renovacionTradeIn').modal('show');
      }
      
    };

    $scope.SolicitarRenovacion = function () {
      if ($scope.Renovar.IdUsuarioContacto && $scope.Renovar.contrato) {
        const { IdEmpresa } = $scope.selectEmpresas.find(empresa => empresa.csn === $scope.EmpresaSelect);
        const payload = {
          Contrato: $scope.Renovar.contrato,
          Suscripciones: $scope.Renovar.suscripciones,
          EmpresaUsuarioFinalCSN: $scope.EmpresaSelect,
          IdEmpresaUsuarioFinal: IdEmpresa,
          IdUsuarioContacto: $scope.Renovar.IdUsuarioContacto
        };
        renewContract(payload);
      } else {
        $scope.ShowToast('Selecciona un usuario de contacto', 'warning');
      }
    };

    $scope.SolicitarRenovacionTradein = function() {
      if ($scope.TradeIn.IdUsuarioContacto && $scope.TradeIn.contrato) {
        const { IdEmpresa } = $scope.selectEmpresas.find(empresa => empresa.csn === $scope.EmpresaSelect);
        const payload = {
          Contrato: $scope.TradeIn.contrato,
          Suscripciones: $scope.TradeIn.suscripciones,
          EmpresaUsuarioFinalCSN: $scope.EmpresaSelect,
          IdEmpresaUsuarioFinal: IdEmpresa,
          IdUsuarioContacto: $scope.TradeIn.IdUsuarioContacto
        };
        tradeInContract(payload);
      } else {
        $scope.ShowToast('Selecciona un usuario de contacto', 'warning');
      }
    };

    $scope.ActualizarCantidad = function (subscriptionNumber) {
      $scope.contracts.forEach(contract => {
        contract.subscriptions.forEach(subscription => {
          if (subscription.subscription_reference_number === subscriptionNumber) {
            subscription.MostrarCantidad = !subscription.MostrarCantidad;
          }
        });
      });
    };

    $scope.ActualizarPartition = function (subscriptionNumber) {
      $scope.contracts.forEach(contract => {
        contract.subscriptions.forEach(subscription => {
          if (subscription.subscription_reference_number === subscriptionNumber) {
            if (subscription.quantityToUpdate <= subscription.quantity) return;
            else {
              $scope.ShowToast('No se puede actualizar a un número mayor de suscripciones.', 'danger');
              subscription.quantityToUpdate = null;
            }
          }
        });
      });
    };

    $scope.actualizarEsquema = function (contractNumber, contractTerm){
      let bandTermSwitch = true;
      const contract = $scope.contracts.find(contract => contract.contract_number === contractNumber);
      const serialNumber = contract.subscriptions.map(subscription => {
        if (subscription.deployment === 'N') bandTermSwitch = false;
        return subscription.subscription_reference_number;
      });
      if (bandTermSwitch) {
        MonitorContratosFactory.actualizarEsquemaRenovacion(contractNumber, serialNumber, contractTerm)
      .then(result => {
        if (result.data.statusCode === 400) $scope.ShowToast(result.data.message, 'danger');
        else {
          contract.termSwitchStatus = true;
          contract.subscriptions.forEach(subscription => subscription.siclick_status = true);
          $scope.ShowToast(result.data.message, 'success');
        }
      })
      .catch(result => {
        $scope.ShowToast(result.data.message, 'danger');
      });
      } else {
        $scope.ShowToast('Cambio de esquema no disponible en series multi usuario.', 'danger');
      }
    };

    $scope.getExtensionDateModal = (contractEndDate, currentContract) => {
      const extensionDates = getExtensionDates(contractEndDate, $scope.contracts);
      const extensionDatesAux = extensionDates.filter(item => item !== undefined);
      $scope.opcionesExtencion = extensionDatesAux;
      showExtrensionModal(currentContract);
    };

    $scope.makeExtension = (contractData, extensionDate) => {
      if (extensionDate) {
        const { IdEmpresa } = $scope.selectEmpresas.find(empresa => empresa.csn === $scope.EmpresaSelect);
        const subs = contractData.subscriptions.map(sub => ({
          subscription_reference_number: sub.subscription_reference_number,
          subscription_type: sub.subscription_type,
          quantity: sub.quantity,
          seats: sub.seats,
          pack_size: sub.pack_size,
          description: sub.description,
          deployment: sub.deployment,
          switch_type: sub.switch_type,
          opportunity_number: sub.opportunity_number,
          contract_number: sub.contract_number,
          contract_start_date: sub.contract_start_date,
          contract_end_date: sub.contract_end_date,
          contract_term: sub.contract_term,
          endCustomer_contract_manager_first: sub.endCustomer_contract_manager_first,
          endCustomer_contract_manager_last: sub.endCustomer_contract_manager_last,
          endCustomer_contract_manager_email: sub.endCustomer_contract_manager_email,
          quantityToUpdate: sub.quantityToUpdate
        }));
        let payload = {
          contractNumber: contractData.contract_number,
          finalUserId: IdEmpresa,
          extensionDate,
          subscriptions: subs
        };
        extendContract(payload);
        payload = {};
      } else {
        $scope.ShowToast('Especifica una fecha fin para la extensión del contrato.', 'warning');
      }
    };

    $scope.getContractData = contractNumber => {
      MonitorContratosFactory.getContractData(contractNumber)
      .then((result) => {
        if (result.status = 200) {
          $scope.contracts = result.data;
          $scope.EmpresaSelect = result.data[0].final_user_csn
          $scope.contracts.forEach(contract => {
            contract.renovacion = contract.contract_end_date;
            contract.esquemaRenovacion = (contract.contract_term === 'Annual') ? 'Anual' : 'Cada 3 años';
            contract.etiquetaTermSwitch = (contract.contract_term === '3-Year') ? 'Actualizar periodo a un año' : 'Actualizar periodo a tres años';
            contract.subscriptions.forEach(subscription => {
              subscription.MostrarCantidad = false;
              if (subscription.product_line === PREMIUM) subscription.is_premium = true;
              if (!subscription.subs_ready || subscription.siclick_status) contract.termSwitchStatus = true;
              if (subscription.deployment === 'S') {
                subscription.implantacion = 'Single-user';
              } else if (subscription.deployment === 'N') {
                subscription.implantacion = 'Multi-user';
              } else if ( subscription.deployment === 'A') {
                subscription.implantacion = 'Hosted';
              } else {
                subscription.implantacion = 'Import Subscription';
              }
            });
          });
        }
        if (result.data.length > 0) {
          $scope.vacio = 1;
        } else {
          $scope.vacio = 0;
        }
      });
    };
  };

  MonitorContratosController.$inject = ['$scope', '$log', '$cookies', '$location', '$uibModal', '$filter', 'MonitorContratosFactory'];

  angular.module('marketplace').controller('MonitorContratosController', MonitorContratosController);
}());
  