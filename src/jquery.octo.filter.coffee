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
  filterContainer: null

  init: ->
    self = @

    @inputContainer = $('<div/>', { class: 'filter-input' }).insertAfter(@input)
    @inputContainer.html(@input)

    # Faz a busca inicial e atribui evento ao clique dos filtros
    #
    @search '', ->
      # Ao filtrar no clique do filtro
      self.filterContainer
        .on 'click', '.filter-link', (event) ->
          event.preventDefault()
          event.stopPropagation()
          self.select $(@).data('value')

      # Ao remove o filtro
      self.inputContainer
        .on 'click', '.filter-clear', (event) ->
          event.preventDefault()
          event.stopPropagation()
          self.clear $(@).closest('.filter-label').data('value')

      # Ao clicar em um área diferente da área do filtro esconde o filtro
      $(document).on 'click', (event) ->
        target  = $(event.target)
        parents = target.parents().add(target)

        if parents.index(self.inputContainer) == -1 and parents.index(self.filterContainer) == -1
          self.filterContainer.hide()

    # Ao clicar no input container dá foco ao input
    #
    @inputContainer.on 'click', ->
      self.input.focus()

    @input
      # Quando o input está em foco os filtros se tornam visíveis
      #
      .on 'focus', ->
        self.filterContainer.show()

      .on 'keydown', ->
        switch event.keyCode or event.which
          # Caso pressione enter não dispara o comportamento padrão
          when 9 then return false
          # Caso pressione backspace e não tenha nada digitado no input remove o último filtro selecionado caso exista
          when 8 then self.clear self.inputContainer.find('.filter-label:last').data('value') unless @value.length
          # Quando aperta o ESC
          when 27
            self.input.val('').blur()
            self.filterContainer.hide()

      .on 'keyup', (event) ->
        switch event.keyCode or event.which
          when 9, 13 # enter e tab
            event.preventDefault()
            filter = self.filterContainer.find('.filter-link.filter-active:first') # Busca o primeiro filtro ativo
            self.select filter.data('value') if filter.length
          else
            if @value.length >= self.options.minChars
              self.search @value
            else
              self.search ''

  # Cria a estrutura html para receber os filtros
  #
  makeFilterContainer: ->
    @filterContainer = $('
      <div class="filter-container">
        <ul class="nav nav-tabs"></ul>
        <div class="tab-content"></div>
      </div>
    ').insertAfter(@input)

    containerNav = []

    for category, categoryLabel of @options.categories
      containerNav.push $('<li/>').html $('<a/>', { href: "#filter-#{category}", text: categoryLabel, class: "nav-#{category}", 'data-toggle': 'tab' })

    @filterContainer
      .find('.nav').html(containerNav)
      .find('li:first').addClass('active')

  # Cria os links dos filtros de acordo com as categorias
  #
  populateFilterContainer: (data) ->
    self = @

    containerContent = []

    if $.isEmptyObject(@options.categories)
      $.each data, (key, value) -> self.options.categories[key] = key
      @makeFilterContainer()

    for category, categoryLabel of @options.categories
      content = []
      data[category] = $.parseJSON(data[category]) if typeof data[category] == 'string'

      if data[category].length
        for item in data[category]
          klass = 'filter-link'
          klass += ' filtered' if $.inArray(item.value or item.name, @selectedFilters[category]) != -1
          content.push $('<a/>', { text: item.name, class: klass, 'data-category': category, 'data-value': item.value or item.name })
      else
        content.push $('<span/>', { text: "Nenhum #{@options.categories[category].toLowerCase()} encontrado.", class: "filter-not-found" })

      containerContent.push $('<div/>', { id: "filter-#{category}", class: 'tab-pane' }).html(content)

    @filterContainer.find('.tab-content').html(containerContent)

    firstFilter = @filterContainer.find('.filter-link:not(.filtered):first') # Seta o primeiro filtro que não já esteja filtrado

    # Seta a aba ativa
    tabActive = if firstFilter.length
      firstFilter.closest('.tab-pane').addClass('active')
    else
      @filterContainer.find('.tab-pane:first').addClass('active')

    @filterContainer.find("[href='##{tabActive.attr('id')}']").tab('show')

    # Seta o link ativo
    firstFilter.addClass('filter-active') if @input.val().length >= @options.minChars

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
        self.cacheData[query] = data # Armazena a consulta no cache

        self.makeFilterContainer() unless self.filterContainer
        self.populateFilterContainer(data)

        # Callbacks
        callback.call() if typeof callback == 'function'
        self.options.onSearch.apply(self, [data]) if typeof self.options.onSearch == 'function'

  # Seleciona e cria a tag
  #
  select: (value) ->
    filter = @filterContainer.find(".filter-link[data-value='#{value}']")
    category = filter.data('category')

    # Retorna falso caso o filtro já esteja selecionado
    if $.inArray(value, @selectedFilters[category]) != -1
      @input.focus()
      return false

    @selectedFilters[category] ?= []
    @selectedFilters[category].push(value) # Armazena o valor como selecionado

    filterLabel = $('<span/>', { class: 'filter-label', text: filter.text(), 'data-value': value, 'data-category': category })
    $('<a/>', { class: 'filter-clear', html: '&times;' }).appendTo(filterLabel)

    filtersLabels = @inputContainer.find('.filter-label')

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
      @inputContainer.find(".filter-label").remove()
      @selectedFilters = {}
      @input.val('')
    else
      filterLabel = @inputContainer.find(".filter-label[data-value='#{value}']").remove()
      category = filterLabel.data('category')
      @selectedFilters[category].splice(@selectedFilters[category].indexOf(value), 1) # Remove dos filtros selecionados

    @input.focus()
    @search @input.val() # Refaz a busca pra desmarcar o filtro
    @options.onClear.apply(@, [@selectedFilters]) if typeof @options.onClear == 'function'

$.fn.extend
  octofilter: (options, args...) ->
    @each ->
      $this = $(this)
      data = $this.data('categoryFilter')

      if !data
        $this.data 'categoryFilter', (data = new OctoFilter(this, options))
      if typeof options == 'string'
        data[options].apply(data, args)

