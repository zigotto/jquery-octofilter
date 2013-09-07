(function() {
  var $, OctoFilter,
    __slice = [].slice;

  $ = jQuery;

  OctoFilter = (function() {
    OctoFilter.prototype.defaults = {
      url: {},
      categories: {},
      paramName: 'query',
      minChars: 3
    };

    function OctoFilter(input, options) {
      this.options = $.extend({}, this.defaults, options);
      this.input = $(input);
      this.init();
    }

    OctoFilter.prototype.cacheData = {};

    OctoFilter.prototype.selectedFilters = {};

    OctoFilter.prototype.inputContainer = null;

    OctoFilter.prototype.filtersContainer = null;

    OctoFilter.prototype.init = function() {
      var self;
      self = this;
      this.inputContainer = $('<div/>', {
        "class": 'octofilter-input'
      }).insertAfter(this.input);
      this.inputContainer.html(this.input);
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
      }).on('keydown', function() {
        switch (event.keyCode || event.which) {
          case 9:
            return false;
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
            event.preventDefault();
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

    OctoFilter.prototype.makeFilterContainer = function() {
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

    OctoFilter.prototype.populateFilterContainer = function(data) {
      var category, categoryLabel, containerContent, content, firstFilter, item, klass, self, tabActive;
      self = this;
      if ($.isEmptyObject(this.options.categories)) {
        $.each(data, function(key, value) {
          return self.options.categories[key] = key;
        });
        this.makeFilterContainer();
      }
      containerContent = (function() {
        var _i, _len, _ref, _ref1, _results;
        _ref = this.options.categories;
        _results = [];
        for (category in _ref) {
          categoryLabel = _ref[category];
          content = [];
          if (typeof data[category] === 'string') {
            data[category] = $.parseJSON(data[category]);
          }
          if (data[category].length) {
            _ref1 = data[category];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              item = _ref1[_i];
              klass = 'octofilter-link';
              if ($.inArray(item.value || item.name, this.selectedFilters[category]) !== -1) {
                klass += ' octofiltered';
              }
              content.push($('<a/>', {
                text: item.name,
                "class": klass,
                'data-category': category,
                'data-value': item.value || item.name
              }));
            }
          } else {
            content.push($('<span/>', {
              text: "" + (this.options.categories[category].toLowerCase()) + " not found.",
              "class": "octofilter-not-found"
            }));
          }
          _results.push($('<div/>', {
            id: "octofilter-" + category,
            "class": 'tab-pane'
          }).html(content));
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

    OctoFilter.prototype.search = function(query, callback) {
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
        params = {};
        params[this.options.paramName] = query;
        return $.getJSON(this.options.url, params, function(data) {
          self.cacheData[query] = data;
          if (!self.filtersContainer) {
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
      }
    };

    OctoFilter.prototype.select = function(value) {
      var category, filter, filterLabel, filtersLabels, _base;
      filter = this.filtersContainer.find(".octofilter-link[data-value='" + value + "']");
      category = filter.data('category');
      if ($.inArray(value, this.selectedFilters[category]) !== -1) {
        this.input.focus();
        return false;
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

    OctoFilter.prototype.clear = function(value) {
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

    return OctoFilter;

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
          $this.data('octofilter', (data = new OctoFilter(this, options)));
        }
        if (typeof options === 'string') {
          return data[options].apply(data, args);
        }
      });
    }
  });

}).call(this);
