/* eslint-disable eqeqeq */
(function () {
  var EmpresasCompletarController = function ($scope, $log, $location, $cookies, $routeParams, EmpresasFactory, EmpresasXEmpresasFactory, EstadosFactory, UsuariosFactory, UsuariosXEmpresasFactory) {
    var IdEmpresaDistribuidor = $routeParams.IdEmpresa;
    var IdMicrosoft = $routeParams.IdMicrosoft;
    var Dominio = $routeParams.Dominio;
    var DatosMicrosoft;
    $scope.Name = $routeParams.Name.replace(/[^0-9A-Za-z\s()@&-]/g, '');
    $scope.newName = $scope.Name;
    $scope.mensajerfc = '';
    $scope.mensajeAlias = '';
    $scope.mensajeL = '';
    $scope.Combo = {};
    $scope.Empresa = {};
    $scope.Empresa.Lada = '52';
    $scope.MostrarCorreo = false;
    $scope.CorreoRepetido = false;
    $scope.direccionValidada = false;
    $scope.showEditName = false;
    $scope.selectIndustrias = {};
    $scope.rfces = [];

    $scope.init = function () {
      $scope.esNavegadorSoportado();
      $scope.CheckCookie();
      EmpresasFactory.getEmpresa(IdEmpresaDistribuidor)
        .success(function (Empresa) {
          $scope.EmpresaD = Empresa[0];
          $scope.Combo.TipoRFC = [{
            Nombre: 'Persona Física'
          }, {
            Nombre: 'Persona Moral'
          }];
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      EmpresasFactory.getCliente(IdMicrosoft)
        .success(function (Empresa) {
          if (!$scope.direccionValida(Empresa.defaultAddress)) {
            $scope.ShowToast('El cliente no cuenta con toda la información para ser importado, actualiza sus datos entrando a partner center ', 'danger');
            return;
          }
          $scope.direccionValidada = true;
          DatosMicrosoft = Empresa;
          if (!Empresa.email) {
            $scope.MostrarCorreo = true;
          } else {
            $scope.MostrarCorreo = false;
            $scope.Empresa.CorreoContacto = Empresa.email;
            $scope.validiaMail(Empresa.email);
          }
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });

      EmpresasFactory.getIndustrias()
      .success(function (result) {
        $scope.selectIndustrias = result.data;
      })
      .error(function (data, status, headers, config) {
        $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
      });

      EmpresasFactory.getprojectsRFC()
      .success(function (projects) {
        projects.content.data.map((project, index) => {
          if (project.rfc != null) {
            $scope.rfces.push(project.rfc.trim());
          }
        });
      })
      .error(function (data, status, headers, config) {
        $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
      });
    };

    $scope.init();

    $scope.direccionValida = function (direccion) {
      if (direccion.addressLine1 && direccion.city && direccion.country && direccion.phoneNumber &&
        direccion.postalCode && direccion.state) return true;
      return false;
    };

    $scope.changeName = function (newName) {
      if (newName != '') {
        $scope.Name = newName.replace(/[^0-9A-Za-z\s()@&-]/g, '');
        $scope.newName = newName.replace(/[^0-9A-Za-z\s()@&-]/g, '');
        $scope.showEditName = false;
        $scope.ValidarAlias();
      }
    };

    $scope.cancelNameChange = function () {
      $scope.Name = $scope.newName;
      $scope.showEditName = false;
    };

    $scope.validiaMail = function (email, callMeMaybe) {
      EmpresasFactory.validaMail(email)
        .success(function (mail) {
          if (mail.data[0].Existe === 1) {
            $scope.MostrarCorreo = true;
            $scope.CorreoRepetido = true;
          } else {
            $scope.CorreoRepetido = false;
            $scope.MostrarCorreo = false;
          }
          if (callMeMaybe) {
            callMeMaybe();
          }
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.intentaImportar = function () {
      $scope.validiaMail($scope.Empresa.CorreoContacto, $scope.EmpresaImportar);
    };

    $scope.EmpresaImportar = function () {
      $scope.ValidarRFC();
      $scope.ValidarAlias();

      if ($scope.Empresa.MonedaPago !== 'Pesos' && $scope.Empresa.MonedaPago !== 'Dólares') {
        return $scope.ShowToast('Selecciona una moneda de pago.', 'danger');
      }
      if ($scope.Empresa.IdFormaPagoPredilecta != 1 && $scope.Empresa.IdFormaPagoPredilecta != 2) {
        return $scope.ShowToast('Selecciona una forma de pago.', 'danger');
      }
      if ($scope.Empresa.MonedaPago === 'Dólares' && $scope.Empresa.IdFormaPagoPredilecta == 1) {
        return $scope.ShowToast('Para pagar con tarjeta es necesario que la moneda sea Pesos.', 'danger');
      }
      if ($scope.frm.RFC.$invalid) {
        return $scope.ShowToast('Problemas con el RFC ingresado, verifique el campo', 'danger');
      }
      if (!$scope.frm.alias.$pristine) {
        return $scope.ShowToast('El nombre de alias es invalido o ya se encuentra registrado, ingrese uno nuevo', 'danger');
      }

      var ObjRFC = {
        RFC: $scope.Empresa.RFC
      };

      EmpresasFactory.revisarRFC(ObjRFC)
        .success(function (result) {
          if (result.length > 0 && result[0].Success == 1) {
            $scope.frm.RFC.$invalid = true;
            $scope.frm.RFC.$pristine = false;
            $scope.mensajerfc = result[0].Message;

            EmpresasFactory.checkRFCImport($scope.Empresa.RFC)
            .success(function (result) {
              const empresaxempresa = result.datosUf.empresaXEmpresa[0];
              const empresaexist = result.datosUf.validateExist[0];
              if (IdEmpresaDistribuidor == empresaxempresa.IdEmpresaDistribuidor) {
                $scope.abrirModal('avisoModal');
              } else if (empresaexist.idEmpresa) {
                $scope.abrirModal('confirmarModal');
              }
            });
          } else {
            $scope.importar();
          }
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.importar = function () {
      UsuariosXEmpresasFactory.getUsuariosXEmpresa(IdEmpresaDistribuidor)
      .success(function (UsuariosXEmpresas) {
        if (UsuariosXEmpresas.length === 0) {
          $scope.ShowToast('Agrega un administrador, para el distribuidor.', 'danger');
        } else {
          var ObjMicrosoft = {
            RFC: $scope.Empresa.RFC,
            NombreEmpresa: $scope.Name,
            Direccion: DatosMicrosoft.defaultAddress.addressLine1,
            Ciudad: DatosMicrosoft.defaultAddress.city,
            Estado: DatosMicrosoft.defaultAddress.state,
            CodigoPostal: DatosMicrosoft.defaultAddress.postalCode,
            NombreContacto: DatosMicrosoft.firstName,
            ApellidoPaterno: DatosMicrosoft.lastName,
            CorreoElectronico: $scope.Empresa.CorreoContacto,
            TelefonoContacto: DatosMicrosoft.defaultAddress.phoneNumber,
            ZonaImpuesto: 'Normal',
            Lada: '52',
            IdMicrosoftUF: IdMicrosoft,
            DominioMicrosoftUF: Dominio,
            IdEmpresaDistribuidor: IdEmpresaDistribuidor,
            IdUsuario: UsuariosXEmpresas[0].IdUsuario,
            MonedaPago: $scope.Empresa.MonedaPago,
            IdFormaPagoPredilecta: $scope.Empresa.IdFormaPagoPredilecta,
            ImportarOrdenes: $scope.Empresa.importarOrdenes
          };
          EmpresasFactory.postEmpresaMicrosoft(ObjMicrosoft)
            .success(function () {
              $location.path('/Empresas');
              $scope.ShowToast('Se está importando la empresa, por favor espere ', 'success');
            })
            .error(function (data, status, headers, config) {
              $scope.ShowToast(data.message, 'danger');
              $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
            });
        }
      })
      .error(function (data, status, headers, config) {
        $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
      });
    };

    function isNumeric (num) {
      return !isNaN(num);
    }

    $scope.EmpresaCancel = function () {
      $location.path('/Empresas/Importar/' + IdEmpresaDistribuidor);
    };

    $scope.ngModelRFCoptionsSelected = function (value) {
      if (arguments.length) {
        $scope.Empresa.RFC = value;
        $scope.ValidarRFC();
      } else {
        return $scope.Empresa.RFC;
      }
    };

    $scope.modelOptions = {
      debounce: {
        default: 500,
        blur: 250
      },
      getterSetter: true
    };

    $scope.ValidarRFC = function () {
      EmpresasFactory.checkRFC({ RFC: $scope.Empresa.RFC })
        .success(function (result) {
          if (result.length == 0 || result[0].Success === 1) {
            for (var i = 0; i < $scope.Empresa.RFC.length; i++) {
              if ($scope.Empresa.RFC[i] == '-' || $scope.Empresa.RFC[i] == ' ' || $scope.Empresa.RFC[i] == '/' || $scope.Empresa.RFC[i] == '.' || $scope.Empresa.RFC[i] == ',') {
                $scope.frm.RFC.$invalid = true;
                $scope.frm.RFC.$pristine = false;
                $scope.valido = false;
                $scope.mensajerfc = 'El RFC es Incorrecto';
              } else {
                $scope.valido = true;
                $scope.frm.RFC.$invalid = false;
              }
              EmpresasFactory.getRFCbyRFC({rfc: $scope.Empresa.RFC})
              .success(function (projects) {
                if (projects.content.data.rfc == undefined) {
                  $scope.frm.RFC.$invalid = true;
                  $scope.frm.RFC.$pristine = false;
                  $scope.valido = false;
                  $scope.mensajerfc = 'El RFC es invalido, verifique este campo o dé de alta al cliente';
                }
              })
              .error(function (data, status, headers, config) {
                $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
              });
            }
          } else {
            $scope.valido = true;
            $scope.frm.RFC.$invalid = false;
            $scope.mensajerfc = 'Este RFC ya está registrado como distribuidor.';
          }
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };

    $scope.ValidarAlias = function () {
      EmpresasFactory.validateAlias({ alias: $scope.Name, idEnterprise: IdEmpresaDistribuidor })
      .success(function (aliasProjects) {
        if (aliasProjects.content.availability == false) {
          $scope.frm.alias.$invalid = true;
          $scope.frm.alias.$pristine = false;
          $scope.mensajeAlias = 'El nombre de alias es invalido o ya se encuentra registrado';
        } else {
          $scope.frm.alias.$invalid = false;
          $scope.frm.alias.$pristine = true;
        }
      })
      .error(function (data, status, headers, config) {
        $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
      });
    };

    $scope.abrirModal = function (modal) {
      document.getElementById(modal).style.display = 'block';
    };
    $scope.cerrarModal = function (modal) {
      document.getElementById(modal).style.display = 'none';
    };
    $scope.ComboRFC = function () {
      EmpresasFactory.checkRFC({ RFC: $scope.Empresa.RFC })
        .success(function (result) {
          if (result.length == 0 || result[0].Success === 1) {
            if ($scope.Empresa.TipoRFC == undefined) {
              $scope.frm.RFC.$invalid = true;
              $scope.frm.RFC.$pristine = false;
              $scope.valido = false;
              $scope.mensajerfc = 'Selecciona un tipo RFC';
            } else {
              $scope.valido = true;
              $scope.frm.RFC.$invalid = false;
              if ($scope.Empresa.RFC != undefined) {
                for (var i = 0; i < $scope.Empresa.RFC.length; i++) {
                  if ($scope.Empresa.RFC[i] == '-' || $scope.Empresa.RFC[i] == ' ' || $scope.Empresa.RFC[i] == '/' || $scope.Empresa.RFC[i] == '.' || $scope.Empresa.RFC[i] == ',') {
                    $scope.frm.RFC.$invalid = true;
                    $scope.frm.RFC.$pristine = false;
                    $scope.valido = false;
                    $scope.mensajerfc = 'El RFC es Incorrecto';
                  } else {
                    $scope.frm.RFC.$invalid = false;
                    $scope.valido = true;

                    if ($scope.Empresa.TipoRFC === 'Persona Física') {
                      if (isNumeric($scope.Empresa.RFC[0]) === true || isNumeric($scope.Empresa.RFC[1]) === true || isNumeric($scope.Empresa.RFC[2]) === true || isNumeric($scope.Empresa.RFC[3]) === true) {
                        $scope.frm.RFC.$invalid = true;
                        $scope.frm.RFC.$pristine = false;
                        $scope.valido = false;
                        $scope.mensajerfc = 'Los primeros 4 digitos deben ser letras.';
                      } else {
                        if ($scope.Empresa.RFC.length != '13') {
                          $scope.frm.RFC.$invalid = true;
                          $scope.frm.RFC.$pristine = false;
                          $scope.valido = false;
                          $scope.mensajerfc = 'El RFC debe tener 13 digitos.';
                        } else {
                          $scope.valido = true;
                          $scope.frm.RFC.$invalid = false;
                        }
                      }
                    }

                    if ($scope.Empresa.TipoRFC === 'Persona Moral') {
                      if (isNumeric($scope.Empresa.RFC[0]) === true || isNumeric($scope.Empresa.RFC[1]) === true || isNumeric($scope.Empresa.RFC[2]) === true) {
                        $scope.frm.RFC.$invalid = true;
                        $scope.frm.RFC.$pristine = false;
                        $scope.valido = false;
                        $scope.mensajerfc = 'Los primeros 3 digitos deben ser letras.';
                      } else {
                        if ($scope.Empresa.RFC.length != '12') {
                          $scope.frm.RFC.$invalid = true;
                          $scope.frm.RFC.$pristine = false;
                          $scope.valido = false;
                          $scope.mensajerfc = 'El RFC debe tener 12 digitos.';
                        } else {
                          $scope.valido = true;
                          $scope.frm.RFC.$invalid = false;
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            $scope.frm.RFC.$invalid = true;
            $scope.frm.RFC.$pristine = false;
            $scope.valido = false;
            $scope.mensajerfc = 'Este RFC ya está registrado como distribuidor.';
          }
        })
        .error(function (data, status, headers, config) {
          $log.log('data error: ' + data.error + ' status: ' + status + ' headers: ' + headers + ' config: ' + config);
        });
    };
  };

  EmpresasCompletarController.$inject = ['$scope', '$log', '$location', '$cookies', '$routeParams', 'EmpresasFactory', 'EmpresasXEmpresasFactory', 'EstadosFactory', 'UsuariosFactory', 'UsuariosXEmpresasFactory'];

  angular.module('marketplace').controller('EmpresasCompletarController', EmpresasCompletarController);
}());
