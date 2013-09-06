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

    OctoFilter.prototype.filterContainer = null;

    OctoFilter.prototype.init = function() {
      var self;
      self = this;
      this.inputContainer = $('<div/>', {
        "class": 'filter-input'
      }).insertAfter(this.input);
      this.inputContainer.html(this.input);
      this.search('', function() {
        self.filterContainer.on('click', '.filter-link', function(event) {
          event.preventDefault();
          event.stopPropagation();
          return self.select($(this).data('value'));
        });
        self.inputContainer.on('click', '.filter-clear', function(event) {
          event.preventDefault();
          event.stopPropagation();
          return self.clear($(this).closest('.filter-label').data('value'));
        });
        return $(document).on('click', function(event) {
          var parents, target;
          target = $(event.target);
          parents = target.parents().add(target);
          if (parents.index(self.inputContainer) === -1 && parents.index(self.filterContainer) === -1) {
            return self.filterContainer.hide();
          }
        });
      });
      this.inputContainer.on('click', function() {
        return self.input.focus();
      });
      return this.input.on('focus', function() {
        return self.filterContainer.show();
      }).on('keydown', function() {
        switch (event.keyCode || event.which) {
          case 9:
            return false;
          case 8:
            if (!this.value.length) {
              return self.clear(self.inputContainer.find('.filter-label:last').data('value'));
            }
            break;
          case 27:
            self.input.val('').blur();
            return self.filterContainer.hide();
        }
      }).on('keyup', function(event) {
        var filter;
        switch (event.keyCode || event.which) {
          case 9:
          case 13:
            event.preventDefault();
            filter = self.filterContainer.find('.filter-link.filter-active:first');
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
      var category, categoryLabel, containerNav, _ref;
      this.filterContainer = $('\
      <div class="filter-container">\
        <ul class="nav nav-tabs"></ul>\
        <div class="tab-content"></div>\
      </div>\
    ').insertAfter(this.input);
      containerNav = [];
      _ref = this.options.categories;
      for (category in _ref) {
        categoryLabel = _ref[category];
        containerNav.push($('<li/>').html($('<a/>', {
          href: "#filter-" + category,
          text: categoryLabel,
          "class": "nav-" + category,
          'data-toggle': 'tab'
        })));
      }
      return this.filterContainer.find('.nav').html(containerNav).find('li:first').addClass('active');
    };

    OctoFilter.prototype.populateFilterContainer = function(data) {
      var category, categoryLabel, containerContent, content, firstFilter, item, klass, self, tabActive, _i, _len, _ref, _ref1;
      self = this;
      containerContent = [];
      if ($.isEmptyObject(this.options.categories)) {
        $.each(data, function(key, value) {
          return self.options.categories[key] = key;
        });
        this.makeFilterContainer();
      }
      _ref = this.options.categories;
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
            klass = 'filter-link';
            if ($.inArray(item.value || item.name, this.selectedFilters[category]) !== -1) {
              klass += ' filtered';
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
            text: "Nenhum " + (this.options.categories[category].toLowerCase()) + " encontrado.",
            "class": "filter-not-found"
          }));
        }
        containerContent.push($('<div/>', {
          id: "filter-" + category,
          "class": 'tab-pane'
        }).html(content));
      }
      this.filterContainer.find('.tab-content').html(containerContent);
      firstFilter = this.filterContainer.find('.filter-link:not(.filtered):first');
      tabActive = firstFilter.length ? firstFilter.closest('.tab-pane').addClass('active') : this.filterContainer.find('.tab-pane:first').addClass('active');
      this.filterContainer.find("[href='#" + (tabActive.attr('id')) + "']").tab('show');
      if (this.input.val().length >= this.options.minChars) {
        return firstFilter.addClass('filter-active');
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
          if (!self.filterContainer) {
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
      filter = this.filterContainer.find(".filter-link[data-value='" + value + "']");
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
        "class": 'filter-label',
        text: filter.text(),
        'data-value': value,
        'data-category': category
      });
      $('<a/>', {
        "class": 'filter-clear',
        html: '&times;'
      }).appendTo(filterLabel);
      filtersLabels = this.inputContainer.find('.filter-label');
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
        this.inputContainer.find(".filter-label").remove();
        this.selectedFilters = {};
        this.input.val('');
      } else {
        filterLabel = this.inputContainer.find(".filter-label[data-value='" + value + "']").remove();
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
        data = $this.data('categoryFilter');
        if (!data) {
          $this.data('categoryFilter', (data = new OctoFilter(this, options)));
        }
        if (typeof options === 'string') {
          return data[options].apply(data, args);
        }
      });
    }
  });

}).call(this);
