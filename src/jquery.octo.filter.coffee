$ = jQuery

class OctoFilter
  defaults:
    url: {}
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

    @inputContainer = $('<div/>', { class: 'octofilter-input' }).insertAfter(@input)
    @inputContainer.html(@input)

    # Faz a busca inicial e atribui evento ao clique dos filtros
    #
    @search '', ->
      # Ao filtrar no clique do filtro
      self.filtersContainer
        .on 'click', '.octofilter-link', (event) ->
          event.preventDefault()
          event.stopPropagation()
          self.select $(@).data('value')

      # Ao remove o filtro
      self.inputContainer
        .on 'click', '.octofilter-clear', (event) ->
          event.preventDefault()
          event.stopPropagation()
          self.clear $(@).closest('.octofilter-label').data('value')

      # Ao clicar em um área diferente da área do filtro esconde o filtro
      $(document).on 'click', (event) ->
        target  = $(event.target)
        parents = target.parents().add(target)

        if parents.index(self.inputContainer) == -1 and parents.index(self.filtersContainer) == -1
          self.filtersContainer.hide()

    # Ao clicar no input container dá foco ao input
    #
    @inputContainer.on 'click', ->
      self.input.focus()

    @input
      # Quando o input está em foco os filtros se tornam visíveis
      #
      .on 'focus', ->
        self.filtersContainer.show()

      .on 'keydown', ->
        switch event.keyCode or event.which
          # Caso pressione enter não dispara o comportamento padrão
          when 9 then return false
          # Caso pressione backspace e não tenha nada digitado no input remove o último filtro selecionado caso exista
          when 8 then self.clear self.inputContainer.find('.octofilter-label:last').data('value') unless @value.length
          # Quando aperta o ESC
          when 27
            self.input.val('').blur()
            self.filtersContainer.hide()

      .on 'keyup', (event) ->
        switch event.keyCode or event.which
          when 9, 13 # enter e tab
            event.preventDefault()
            filter = self.filtersContainer.find('.octofilter-link.octofilter-active:first') # Busca o primeiro filtro ativo
            self.select filter.data('value') if filter.length
          else
            if @value.length >= self.options.minChars
              self.search @value
            else
              self.search ''

  # Cria a estrutura html para receber os filtros
  #
  makeFilterContainer: ->
    @filtersContainer = $('
      <div class="octofilter-container">
        <ul class="nav nav-tabs"></ul>
        <div class="tab-content"></div>
      </div>
    ').insertAfter(@input) unless @filtersContainer

    containerNav = for category, categoryLabel of @options.categories
      $('<li/>').html $('<a/>', { href: "#octofilter-#{category}", text: categoryLabel, class: "nav-#{category}", 'data-toggle': 'tab' })

    @filtersContainer
      .find('.nav').html(containerNav)
      .find('li:first').addClass('active')

  # Cria os links dos filtros de acordo com as categorias
  #
  populateFilterContainer: (data) ->
    self = @

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
          klass = ['octofilter-link']
          klass.push 'octofiltered' if $.inArray(item.value or item.name, @selectedFilters[category]) != -1
          $('<a/>', { text: item.name, class: klass, 'data-category': category, 'data-value': item.value or item.name })
      else
        $('<span/>', { text: "#{@options.categories[category].toLowerCase()} not found.", class: "octofilter-not-found" })

      $('<div/>', { id: "octofilter-#{category}", class: 'tab-pane' }).html(filters)

    @filtersContainer.find('.tab-content').html(containerContent)

    firstFilter = @filtersContainer.find('.octofilter-link:not(.octofiltered):first') # Seta o primeiro filtro que não já esteja filtrado

    # Seta a aba ativa
    tabActive = if firstFilter.length
      firstFilter.closest('.tab-pane').addClass('active')
    else
      @filtersContainer.find('.tab-pane:first').addClass('active')

    @filtersContainer.find("[href='##{tabActive.attr('id')}']").tab('show')

    # Seta o link ativo
    firstFilter.addClass('octofilter-active') if @input.val().length >= @options.minChars

  # Faz a busca dos filtros
  #
  search: (query, callback) ->
    self = @

    if @cacheData[query]
      @populateFilterContainer(@cacheData[query])
      callback.call() if typeof callback == 'function'
      @options.onSearch.apply(@, [@cacheData[query]]) if typeof @options.onSearch == 'function'
    else
      params = {}
      params[@options.paramName] = query

      $.getJSON @options.url, params, (data) ->
        self.cacheData[query] = data # stores the query in cache

        self.makeFilterContainer() unless self.filtersContainer
        self.populateFilterContainer(data)

        # Callbacks
        callback.call() if typeof callback == 'function'
        self.options.onSearch.apply(self, [data]) if typeof self.options.onSearch == 'function'

  # Seleciona e cria a tag
  #
  select: (value) ->
    filter = @filtersContainer.find(".octofilter-link[data-value='#{value}']")
    category = filter.data('category')

    # Retorna falso caso o filtro já esteja selecionado
    if $.inArray(value, @selectedFilters[category]) != -1
      @input.focus()
      return false

    @selectedFilters[category] ?= []
    @selectedFilters[category].push(value) # Armazena o valor como selecionado

    filterLabel = $('<span/>', { class: 'octofilter-label', text: filter.text(), 'data-value': value, 'data-category': category })
    $('<a/>', { class: 'octofilter-clear', html: '&times;' }).appendTo(filterLabel)

    filtersLabels = @inputContainer.find('.octofilter-label')

    # Caso tenha algum filtro selecionado ele é inserido após esse filtro
    # Caso não tenha ele é criado antes do input
    if filtersLabels.length
      filtersLabels.last().after(filterLabel)
    else
      @inputContainer.prepend(filterLabel)

    @input.val('').focus() # Limpa o valor do campo
    @search('') # Limpa a busca

    # Callback
    @options.onSelect.apply(@, [@selectedFilters]) if typeof @options.onSelect == 'function'

  # Remove o filtro da lista de selecionados
  #
  clear: (value) ->
    unless value
      @inputContainer.find(".octofilter-label").remove()
      @selectedFilters = {}
      @input.val('')
    else
      filterLabel = @inputContainer.find(".octofilter-label[data-value='#{value}']").remove()
      category = filterLabel.data('category')
      @selectedFilters[category].splice(@selectedFilters[category].indexOf(value), 1) # Remove dos filtros selecionados

    @input.focus()
    @search @input.val() # Refaz a busca pra desmarcar o filtro
    @options.onClear.apply(@, [@selectedFilters]) if typeof @options.onClear == 'function'

$.fn.extend
  octofilter: (options, args...) ->
    @each ->
      $this = $(this)
      data = $this.data('octofilter')

      if !data
        $this.data 'octofilter', (data = new OctoFilter(this, options))
      if typeof options == 'string'
        data[options].apply(data, args)

