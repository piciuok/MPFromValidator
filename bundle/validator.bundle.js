(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.Validator = factory());
}(this, function () { 'use strict';

    if (typeof Object.assign != 'function') {
        Object.assign = function(target, varArgs) { // .length of function is 2
            if (target == null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }

    if ('NodeList' in window && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    var Rules = {
        'required': {
            valid: (value, field) => {
                if(field.type === 'radio' || field.type === 'checkbox') {
                    const elements = document.getElementsByName(field.name);
                    let anyChecked = false;

                    elements.forEach(radio => {
                        if(anyChecked) return true;
                        if(radio.checked) {
                            anyChecked = true;
                            return true;
                        }
                    });
                    return anyChecked;

                } else if(field.type === 'select') {
                    return value !== "";
                } else
                return value.length !== 0
            },
        },
        'phone' : {
            valid: (value, field) => {
                const re = /([0-9]+){9}/;
                return re.test(value)
            },
        },
        'email' : {
            valid: (value, field) => {
                const re = /\S+@\S+\.\S+/;
                return re.test(value)
            },
        },
        'password' : {
            valid: (value, field) => {
                console.log(value);
                const minLowercase  = '(?=.*[a-z])';
                const minUppercase  = '(?=.*[A-Z])';
                const minNumeric    = '(?=.*[0-9])';
                const minSpecial    = '(?=.*[!@#\\$%\\^&])';
                const minLenght     = '(?=.{8,})';
                const re = new RegExp(`^${minLowercase}${minUppercase}${minNumeric}${minSpecial}${minLenght}`);
                return re.test(value)
            },
        }
    };

    var Events = {
        onFieldValidateError: function (field, value, errorMessages) {
            if(this.debug) {
                console.log('Fire onFieldValidateError');
            }
        },

        onFieldValidateSuccessful: function (field, value) {
            if(this.debug) {
                console.log('Fire onFieldValidateSuccessful');
            }
        },

        onFormValidationError: function (form, errorMessages) {
            if(this.debug) {
                console.log('Fire onFormValidationError');
            }
        },

        onFormValidationSuccessful: function (form) {
            if(this.debug) {
                console.log('Fire onFormValidationSuccessful');
            }
        },

        beforeFieldValidation: function (field) {
            if(this.debug) {
                console.log('Fire beforeFieldValidation');
            }
        },

        afterFieldValidation: function (field) {
            if(this.debug) {
                console.log('Fire afterFieldValidation');
            }
        },

        beforeFormValidation: function (form) {
            if(this.debug) {
                console.log('Fire beforeFormValidation');
            }
        },

        afterFormValidation: function (form) {
            if(this.debug) {
                console.log('Fire afterFormValidation');
            }
        }
    };

    var Translations = {
      "Rules": {
        "Errors": {
          "required": "To pole jest wymagane",
          "phone": "Niepoprawny format numeru",
          "email": "Niepoprawny format adresu email",
          "password": "Hasło zbyt słabe"
        }
      }
    };

    function Validator(options = {}) {
      const _options = {
        debug: false,
        constraints: {},
        errorWrapperClass: 'form-errors-msgs',
        errorClass: 'single-error-msg',
        errorPosition: 'before', //before|after
        translations: Translations,
        rules: Rules,
        ...Events
      };

      options = {
        ..._options,
        ...options
      };

      Object.assign(this, options);
    }

    Validator.prototype = {
      construct: Validator,
      errors: {},
      form: null,

      /**
       * Get Value from self deep properties, eg. path = translations.Rules.Errors.required, return a string
       * 'To pole jest wymagane'
       **/
      _getDeepPropertyValue: function(start = this, path = '') {
        let tree = path.split('.');
        let obj = start;

        if(tree.length === 0) {
          if(this.debug) {
            console.log(`You shouldn't read anything from mains properties. Path: ${path}`);
          }
          return `You shouldn't read anything from main properties. Path: ${path}`;
        }

        function readTreeValue(tree, prop) {
          const nextProp = tree.shift();
          if(prop[nextProp] === undefined) return false;
          prop = prop[nextProp];
          if(tree.length !== 0) return readTreeValue(tree, prop); else return prop;
        }

        let value = readTreeValue(tree, obj);

        if(value === false) {
          if(this.debug) {
            console.log(`Invalid property path: ${path}. Check your object below:`);
            console.log(obj);
          }
          return `BAD PROPERTY PATH: ${path}`;
        } else return value;
      },

      /**
       * Get translated message
       * TODO
       **/
      getTranslated: function(path) {
        return this._getDeepPropertyValue(this.translations, path);
      },

      /**
       * Validate whole form
       **/
      validateForm: function(form = null) {
        if(form === null) {
          console.log(`You don't pass form element`);
          return;
        }

        this.form = form;

        this.removeAllErrorMessages();
        this.beforeFormValidation(form);

        if(this.debug) {
          console.log(`Total form elements: ${form.elements.length}`);
        }

        let alreadyChecked = [];

        for(let i = 0; i < form.elements.length; i++) {
          if(alreadyChecked.includes(form.elements[i].name)) continue;
          this.validateField(form.elements[i]);
          alreadyChecked.push(form.elements[i].name);
        }

        this.afterFormValidation(form);

        if(!this.isFormValid()) {
          this.onFormValidationError(form, this.getErrors());
        } else {
          this.onFormValidationSuccessful(form);
        }
      },

      /**
       * Validate single field (native JS Object)
       **/
      validateField: function(field = null, forceValue = false) {
        if(field === null) {
          console.log(`You don't pass a field`);
          return;
        }

        const value = forceValue !== false ? forceValue : field.value;

        const name = field.name;
        const fieldHasParams = this.constraints[name] !== undefined;

        if(name === "") {
          if(this.debug) {
            console.log(`${field} without name!`);
          }
          return;
        }

        if(!fieldHasParams) {
          if(this.debug) {
            console.log(`No constraints for ${name}`);
          }
          return;
        }

        this._removeFieldErrors(name, field);

        this.beforeFieldValidation(field);

        let errorsState = [];
        let errorMessages = [];

        const params = this.constraints[name];

        /**
         * Iterate over field key:values
         **/
        Object.keys(params).map((rule) => {
          let _valid = true;

          if(this.rules[rule] === undefined) {
            console.log(`Rule not exists for: ${rule}`);
          } else {
            _valid = this.rules[rule].valid(value, field);

            if(!_valid) {
              errorMessages.push( this.getTranslated(`Rules.Errors.${rule}`) );
            }
            errorsState.push( _valid );
          }
        });

        this.afterFieldValidation(field);

        if(errorsState.indexOf(false) >=0 ) {
          this.onFieldValidateError(field, value, errorMessages);
          this._addFieldErrors(name, field, errorMessages);
          return false;
        } else {
          this.onFieldValidateSuccessful(field, value);
          this._removeFieldErrors(name, field);
          return true;
        }
      },

      /**
       * Remove key (fieldName) from errors object
       * Remove field errors from HTML
       **/
      _removeFieldErrors: function(fieldName, field) {
        // return;
        if(this.errors[fieldName] !== undefined) {
          delete this.errors[fieldName];
        }

        this.removeErrorMessagesFromField(field, fieldName);
      },

      /**
       * Add key (fieldName) with errorsArray, to errors object
       * Add form errors to HTML
       **/
      _addFieldErrors: function(fieldName, field, errorsArray) {
        this.errors[fieldName] = errorsArray;

        this.addErrorMessagesToField(fieldName, errorsArray);
      },

      /**
       * Clear all messages from whole document
       **/
      removeAllErrorMessages: function() {
        // return;
        this.errors = {};

        const errorsMessages = document.querySelectorAll(`.${this.errorWrapperClass}`);
        errorsMessages.forEach(error => {
          error.remove();
        });
      },

      /**
       * Remove added Errors to HTML from single field
       **/
      removeErrorMessagesFromField: function(field = null, fieldName = false) {
        if(field === null) return;

        const errorsMessages = field.parentElement.querySelectorAll(`.${this.errorWrapperClass}`);
        errorsMessages.forEach(error => {
          error.remove();
        });
      },

      /**
       * Add Errors to HTML of single field
       **/
      addErrorMessagesToField: function(fieldName = null, messages) {
        if(fieldName === null || fieldName === "") {
          console.log(`No fieldName passed`);
          return;
        }

        let msg = document.createElement('DIV');
        let targetField = document.querySelector(`[name="${fieldName}"]`);
        let parent = targetField.parentElement;

        msg.classList.add(this.errorWrapperClass);

        messages.forEach( message => {
          let inner = document.createElement('SPAN');
          let text = document.createTextNode(message);

          inner.classList.add(this.errorClass);
          inner.appendChild(text);
          msg.appendChild(inner);
        });

        if(this.errorPosition === 'after') {
          parent.appendChild(msg);
        } else {
          parent.insertBefore(msg, targetField);
        }

      },

      /**
       * Check form is valid - based on errors count
       **/
      isFormValid: function() {
        return Object.keys(this.errors).length === 0;
      },

      /**
       * Get errors object - key: errorsArray
       **/
      getErrors: function() {
        return this.isFormValid() ? false: this.errors;
      },

      debugMsg: function (msg) {
        console.log(msg);
      }
    };

    return Validator;

}));