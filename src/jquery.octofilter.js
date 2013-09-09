(function() {
  var $, Octofilter,
    __slice = [].slice;

  $ = jQuery;

  Octofilter = (function() {
    Octofilter.prototype.defaults = {
      source: {},
      categories: {},
      paramName: 'query',
      minChars: 3
    };

    function Octofilter(input, options) {
      this.options = $.extend({}, this.defaults, options);
      this.input = $(input);
      this.init();
    }

    Octofilter.prototype.cacheData = {};

    Octofilter.prototype.selectedFilters = {};

    Octofilter.prototype.inputContainer = null;

    Octofilter.prototype.filtersContainer = null;

    Octofilter.prototype.init = function() {
      var self;
      self = this;
      this.input.attr({
        autocomplete: 'off'
      });
      this.inputContainer = this.input.wrap('<div class="octofilter-input" />').parent();
      this.search('', function() {
        self.filtersContainer.on('click', '.octofilter-link', function(event) {
          event.preventDefault();
          event.stopPropagation();
          return self.select($(this).data('value'));
        });
        self.inputContainer.on('click', '.octofilter-clear', function(event) {
          event.preventDefault();
          event.stopPropagation();
          return self.clear($(this).closest('.octofilter-label').data('value'));
        });
        return $(document).on('click', function(event) {
          var parents, target;
          target = $(event.target);
          parents = target.parents().add(target);
          if (parents.index(self.inputContainer) === -1 && parents.index(self.filtersContainer) === -1) {
            return self.filtersContainer.hide();
          }
        });
      });
      this.inputContainer.on('click', function() {
        return self.input.focus();
      });
      return this.input.on('focus', function() {
        return self.filtersContainer.show();
      }).on('keydown', function(event) {
        switch (event.keyCode || event.which) {
          case 9:
          case 13:
            return event.preventDefault();
          case 8:
            if (!this.value.length) {
              return self.clear(self.inputContainer.find('.octofilter-label:last').data('value'));
            }
            break;
          case 27:
            self.input.val('').blur();
            return self.filtersContainer.hide();
        }
      }).on('keyup', function(event) {
        var filter;
        switch (event.keyCode || event.which) {
          case 9:
          case 13:
            filter = self.filtersContainer.find('.octofilter-link.octofilter-active:first');
            if (filter.length) {
              return self.select(filter.data('value'));
            }
            break;
          default:
            if (this.value.length >= self.options.minChars) {
              return self.search(this.value);
            } else {
              return self.search('');
            }
        }
      });
    };

    Octofilter.prototype.makeFilterContainer = function() {
      var category, categoryLabel, containerNav;
      if (!this.filtersContainer) {
        this.filtersContainer = $('\
      <div class="octofilter-container">\
        <ul class="nav nav-tabs"></ul>\
        <div class="tab-content"></div>\
      </div>\
    ').insertAfter(this.input);
      }
      containerNav = (function() {
        var _ref, _results;
        _ref = this.options.categories;
        _results = [];
        for (category in _ref) {
          categoryLabel = _ref[category];
          _results.push($('<li/>').html($('<a/>', {
            href: "#octofilter-" + category,
            text: categoryLabel,
            "class": "nav-" + category,
            'data-toggle': 'tab'
          })));
        }
        return _results;
      }).call(this);
      return this.filtersContainer.find('.nav').html(containerNav).find('li:first').addClass('active');
    };

    Octofilter.prototype.populateFilterContainer = function(data) {
      var category, categoryLabel, containerContent, filters, firstFilter, item, klass, self, tabActive;
      self = this;
      data = $.extend({}, data);
      if ($.isEmptyObject(this.options.categories)) {
        $.each(data, function(key, value) {
          return self.options.categories[key] = key;
        });
        this.makeFilterContainer();
      }
      containerContent = (function() {
        var _ref, _results;
        _ref = this.options.categories;
        _results = [];
        for (category in _ref) {
          categoryLabel = _ref[category];
          if (typeof data[category] === 'string') {
            data[category] = $.parseJSON(data[category]);
          }
          if (self.input.val().length >= self.options.minChars) {
            data[category] = $.grep(data[category], function(category) {
              return category.name.toLowerCase().indexOf(self.input.val().toLowerCase()) !== -1;
            });
          }
          filters = (function() {
            var _i, _len, _ref1, _results1;
            if (data[category].length) {
              _ref1 = data[category];
              _results1 = [];
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                item = _ref1[_i];
                klass = 'octofilter-link';
                if ($.inArray(item.value || item.name, this.selectedFilters[category]) !== -1) {
                  klass += ' octofiltered';
                }
                _results1.push($('<a/>', {
                  text: item.name,
                  "class": klass,
                  'data-category': category,
                  'data-value': item.value || item.name
                }));
              }
              return _results1;
            } else {
              return $('<span/>', {
                text: "" + (this.options.categories[category].toLowerCase()) + " not found.",
                "class": "octofilter-not-found"
              });
            }
          }).call(this);
          _results.push($('<div/>', {
            id: "octofilter-" + category,
            "class": 'tab-pane'
          }).html(filters));
        }
        return _results;
      }).call(this);
      this.filtersContainer.find('.tab-content').html(containerContent);
      firstFilter = this.filtersContainer.find('.octofilter-link:not(.octofiltered):first');
      tabActive = firstFilter.length ? firstFilter.closest('.tab-pane').addClass('active') : this.filtersContainer.find('.tab-pane:first').addClass('active');
      this.filtersContainer.find("[href='#" + (tabActive.attr('id')) + "']").tab('show');
      if (this.input.val().length >= this.options.minChars) {
        return firstFilter.addClass('octofilter-active');
      }
    };

    Octofilter.prototype.search = function(query, callback) {
      var params, self;
      self = this;
      if (this.cacheData[query]) {
        this.populateFilterContainer(this.cacheData[query]);
        if (typeof callback === 'function') {
          callback.call();
        }
        if (typeof this.options.onSearch === 'function') {
          return this.options.onSearch.apply(this, [this.cacheData[query]]);
        }
      } else {
        if (typeof this.options.source === 'string') {
          params = {};
          params[this.options.paramName] = query;
          return $.getJSON(this.options.source, params, function(data) {
            self.cacheData[query] = data;
            if (self.filtersContainer == null) {
              self.makeFilterContainer();
            }
            self.populateFilterContainer(data);
            if (typeof callback === 'function') {
              callback.call();
            }
            if (typeof self.options.onSearch === 'function') {
              return self.options.onSearch.apply(self, [data]);
            }
          });
        } else {
          if (this.filtersContainer == null) {
            this.makeFilterContainer();
          }
          this.populateFilterContainer(this.options.source);
          if (typeof callback === 'function') {
            callback.call();
          }
          if (typeof this.options.onSearch === 'function') {
            return this.options.onSearch.apply(self, [this.options.source]);
          }
        }
      }
    };

    Octofilter.prototype.select = function(value) {
      var category, filter, filterLabel, filtersLabels, _base;
      filter = this.filtersContainer.find(".octofilter-link[data-value='" + value + "']");
      category = filter.data('category');
      if ($.inArray(value, this.selectedFilters[category]) !== -1) {
        this.input.focus();
        return;
      }
      if ((_base = this.selectedFilters)[category] == null) {
        _base[category] = [];
      }
      this.selectedFilters[category].push(value);
      filterLabel = $('<span/>', {
        "class": 'octofilter-label',
        text: filter.text(),
        'data-value': value,
        'data-category': category
      });
      $('<a/>', {
        "class": 'octofilter-clear',
        html: '&times;'
      }).appendTo(filterLabel);
      filtersLabels = this.inputContainer.find('.octofilter-label');
      if (filtersLabels.length) {
        filtersLabels.last().after(filterLabel);
      } else {
        this.inputContainer.prepend(filterLabel);
      }
      this.input.val('').focus();
      this.search('');
      if (typeof this.options.onSelect === 'function') {
        return this.options.onSelect.apply(this, [this.selectedFilters]);
      }
    };

    Octofilter.prototype.clear = function(value) {
      var category, filterLabel;
      if (!value) {
        this.inputContainer.find(".octofilter-label").remove();
        this.selectedFilters = {};
        this.input.val('');
      } else {
        filterLabel = this.inputContainer.find(".octofilter-label[data-value='" + value + "']").remove();
        category = filterLabel.data('category');
        this.selectedFilters[category].splice(this.selectedFilters[category].indexOf(value), 1);
      }
      this.input.focus();
      this.search(this.input.val());
      if (typeof this.options.onClear === 'function') {
        return this.options.onClear.apply(this, [this.selectedFilters]);
      }
    };

    return Octofilter;

  })();

  $.fn.extend({
    octofilter: function() {
      var args, options;
      options = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return this.each(function() {
        var $this, data;
        $this = $(this);
        data = $this.data('octofilter');
        if (!data) {
          $this.data('octofilter', (data = new Octofilter(this, options)));
        }
        if (typeof options === 'string') {
          return data[options].apply(data, args);
        }
      });
    }
  });

}).call(this);
