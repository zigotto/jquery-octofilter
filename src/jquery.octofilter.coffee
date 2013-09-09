$ = jQuery

class Octofilter
  defaults:
    source: {}
    categories: {}
    paramName: 'query'
    minChars: 3

  constructor: (input, options) ->
    @options = $.extend({}, @defaults, options)
    @input = $(input)
    @init()

  cacheData: {}
  selectedFilters: {}
  inputContainer: null
  filtersContainer: null

  init: ->
    self = @

    @input.attr(autocomplete: 'off') # Define default autocomplete as off
    @inputContainer = @input.wrap('<div class="octofilter-input" />').parent()

    # Make the initial search
    # Triggerable filter events
    @search '', ->
      # Select filter
      self.filtersContainer.on 'click', '.octofilter-link', (event) ->
        event.preventDefault()
        event.stopPropagation()
        self.select $(@).data('value')

      # Clear filter
      self.inputContainer.on 'click', '.octofilter-clear', (event) ->
        event.preventDefault()
        event.stopPropagation()
        self.clear $(@).closest('.octofilter-label').data('value')

      # Ao clicar em um área diferente da área do filtro esconde o filtro
      $(document).on 'click', (event) ->
        target  = $(event.target)
        parents = target.parents().add(target)

        if parents.index(self.inputContainer) == -1 and parents.index(self.filtersContainer) == -1
          self.filtersContainer.hide()

    # Focus when click on input container
    @inputContainer.on 'click', ->
      self.input.focus()

    @input
      .on 'focus', ->
        self.filtersContainer.show()

      .on 'keydown', (event) ->
        switch event.keyCode or event.which
          # Return if tab is pressed
          when 9, 13 then event.preventDefault()
          # Clear the last filter if backspace is pressed
          when 8 then self.clear self.inputContainer.find('.octofilter-label:last').data('value') unless @value.length
          # Clear search if esc is pressed
          when 27
            self.input.val('').blur()
            self.filtersContainer.hide()

      .on 'keyup', (event) ->
        switch event.keyCode or event.which
          # Enter and tab
          when 9, 13
            filter = self.filtersContainer.find('.octofilter-link.octofilter-active:first') # Busca o primeiro filtro ativo
            self.select filter.data('value') if filter.length
          else
            if @value.length >= self.options.minChars
              self.search @value
            else
              self.search ''

  makeFilterContainer: ->
    @filtersContainer = $(
      '<div class="octofilter-container">' +
        '<ul class="nav nav-tabs"></ul>' +
        '<div class="tab-content"></div>' +
      '</div>'
    ).insertAfter(@input) unless @filtersContainer

    containerNav = for category, categoryLabel of @options.categories
      $('<li/>').html $('<a/>', { href: "#octofilter-#{category}", text: categoryLabel, class: "nav-#{category}", 'data-toggle': 'tab' })

    @filtersContainer
      .find('.nav').html(containerNav)
      .find('li:first').addClass('active')

  populateFilterContainer: (data) ->
    self = @

    data = $.extend({}, data) # Cloning the data

    if $.isEmptyObject(@options.categories)
      $.each data, (key, value) ->
        self.options.categories[key] = key
      @makeFilterContainer()

    containerContent = for category, categoryLabel of @options.categories
      data[category] = $.parseJSON(data[category]) if typeof data[category] == 'string'

      # Performs the search and returns the values found
      if self.input.val().length >= self.options.minChars
        data[category] = $.grep data[category], (category) ->
          category.name.toLowerCase().indexOf(self.input.val().toLowerCase()) != -1

      filters = if data[category].length
        for item in data[category]
          klass = 'octofilter-link'
          klass += ' octofiltered' if $.inArray(item.value or item.name, @selectedFilters[category]) != -1
          $('<a/>', { text: item.name, class: klass, 'data-category': category, 'data-value': item.value or item.name })
      else
        $('<span/>', { text: "#{@options.categories[category].toLowerCase()} not found.", class: "octofilter-not-found" })

      $('<div/>', { id: "octofilter-#{category}", class: 'tab-pane' }).html(filters)

    @filtersContainer.find('.tab-content').html(containerContent)

    firstFilter = @filtersContainer.find('.octofilter-link:not(.octofiltered):first') # Return the first filter which isn't filtered

    # Define what is the active tab
    tabActive = if firstFilter.length
      firstFilter.closest('.tab-pane').addClass('active')
    else
      @filtersContainer.find('.tab-pane:first').addClass('active')

    @filtersContainer.find("[href='##{tabActive.attr('id')}']").tab('show')

    # Define the active link
    firstFilter.addClass('octofilter-active') if @input.val().length >= @options.minChars

  search: (query, callback) ->
    self = @

    if @cacheData[query]
      @populateFilterContainer(@cacheData[query])
      callback.call() if typeof callback == 'function'
      @options.onSearch.apply(@, [@cacheData[query]]) if typeof @options.onSearch == 'function'
    else
      if typeof @options.source is 'string'
        params = {}
        params[@options.paramName] = query

        $.getJSON @options.source, params, (data) ->
          self.cacheData[query] = data # Stores the query in cache

          self.makeFilterContainer() unless self.filtersContainer?
          self.populateFilterContainer(data)

          # Callbacks
          callback.call() if typeof callback == 'function'
          self.options.onSearch.apply(self, [data]) if typeof self.options.onSearch == 'function'
      else
        @makeFilterContainer() unless @filtersContainer?
        @populateFilterContainer(@options.source)

        # Callbacks
        callback.call() if typeof callback == 'function'
        @options.onSearch.apply(self, [@options.source]) if typeof @options.onSearch == 'function'

  select: (value) ->
    filter = @filtersContainer.find(".octofilter-link[data-value='#{value}']")
    category = filter.data('category')

    # Return when the filter isn't selected
    if $.inArray(value, @selectedFilters[category]) != -1
      @input.focus()
      return

    @selectedFilters[category] ?= []
    @selectedFilters[category].push(value) # Store the selected value

    filterLabel = $('<span/>', { class: 'octofilter-label', text: filter.text(), 'data-value': value, 'data-category': category })
    $('<a/>', { class: 'octofilter-clear', html: '&times;' }).appendTo(filterLabel)

    filtersLabels = @inputContainer.find('.octofilter-label')

    # Add filter in selecteds filters
    if filtersLabels.length
      filtersLabels.last().after(filterLabel)
    else
      @inputContainer.prepend(filterLabel)

    # Clear input value and seach
    @input.val('').focus()
    @search('')

    # Callback
    @options.onSelect.apply(@, [@selectedFilters]) if typeof @options.onSelect == 'function'

  clear: (value) ->
    unless value
      @inputContainer.find(".octofilter-label").remove()
      @selectedFilters = {}
      @input.val('')
    else
      filterLabel = @inputContainer.find(".octofilter-label[data-value='#{value}']").remove()
      category = filterLabel.data('category')
      @selectedFilters[category].splice(@selectedFilters[category].indexOf(value), 1) # Clean the filters selected

    @input.focus()
    @search @input.val() # Remake the search to clear the filter
    @options.onClear.apply(@, [@selectedFilters]) if typeof @options.onClear == 'function'

$.fn.extend
  octofilter: (options, args...) ->
    @each ->
      $this = $(this)
      data = $this.data('octofilter')

      if !data
        $this.data 'octofilter', (data = new Octofilter(this, options))
      if typeof options == 'string'
        data[options].apply(data, args)
