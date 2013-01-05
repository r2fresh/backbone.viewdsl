((root, factory) ->
  if typeof define == 'function' and define.amd
    define ['jquery', 'rsvp', 'backbone', 'underscore'], (jQuery, RSVP, Backbone, _) ->
      jQuery = jQuery or root.jQuery
      RSVP = RSVP or root.RSVP
      Backbone = Backbone or root.Backbone
      _ = _ or root._
      root.Backbone.ViewDSL = factory(jQuery, RSVP, Backbone, _)
  else
    root.Backbone.ViewDSL = factory(root.jQuery, root.RSVP, root.Backbone, root._)

) this, (jQuery, RSVP, Backbone, _) ->

  RSVP.Promise::end = ->
    this.then undefined, (e) -> throw e

  toArray = (o) ->
    Array::slice.call(o)

  getByPath = (o, p) ->
    if p.trim().length == 0
      return [o, window]
    for n in p.split('.')
      ctx = o
      o = ctx[n]
      break if o == undefined
    {attr: o, attrCtx: ctx}

  getBySpec = (spec) ->
    if /:/.test spec
      [module, path] = spec.split(':', 2)
      promiseRequire(module)
        .then (module) -> getByPath(module, path).attr
    else
      promise getByPath(window, spec).attr

  promise = (value) ->
    p = new RSVP.Promise()
    p.resolve(value)
    p

  join = (promises) ->
    p = new RSVP.Promise()
    results = []
    if promises.length > 0
      resultsToGo = promises.length
      for pr, idx in promises
        do (pr, idx) =>
          pr.then (result) ->
            results[idx] = result
            resultsToGo = resultsToGo - 1
            if resultsToGo == 0
              p.resolve(results)
    else
      p.resolve(results)
    p

  promiseRequire = (moduleName) ->
    p = new RSVP.Promise()
    require [moduleName], (module) -> p.resolve(module)
    p

  hypensToCamelCase = (o) ->
    o.replace /-([a-z])/g, (g) -> g[1].toUpperCase()

  replaceChild = (o, ns) ->
    p = o.parentNode
    for n in ns
      if typeof n.cloneNode == 'function'
        p.insertBefore(n, o)
      else if typeof n.item == 'function' and n.length or n.jquery
        p.insertBefore(m, o) for m in n
      else
        p.insertBefore(document.createTextNode(String(n)), o)
    p.removeChild(o)
    ns

  render = (context, node, overlays...) ->
    synContext = makeContext(context, overlays...)
    process(synContext, node).then (result) ->
      for prop of synContext when synContext.hasOwnProperty(prop)
        context[prop] = synContext[prop]
      result

  process = (context, node) ->
    processAttributes(context, node)
      .then (pragmas) ->
        if pragmas.remove and node.parentNode
          node.parentNode.removeChild(node)
          promise
        else
          processNode(context, node)

  processNode = (context, node) ->
    if node.nodeType == 3
      nodes = processTextNode(context, node)
      node = replaceChild(node, nodes) if nodes
      promise node
    else
      join(process(context, n) for n in toArray(node.childNodes)).then -> node

  textNodeSplitRe = /({{)|(}})/

  processTextNode = (context, node) ->
    return unless textNodeSplitRe.test node.data
    data = node.data
    data = data.replace(/{{/g, '{{\uF001')
    parts = data.split(textNodeSplitRe)
    parts = parts.filter (e) -> e and e != '{{' and e != '}}'
    for part in parts
      if part[0] == '\uF001'
        {attr, attrCtx} = getByPath(context, part.slice(1).trim())
        value = if jQuery.isFunction(attr) then attr.call(attrCtx) else attr
        value or ''
      else
        part

  processAttributes = (context, node) ->
    if node.attributes?.if
      {attr, attrCtx} = getByPath(context, node.attributes.if.value)
      show = if jQuery.isFunction(attr) then attr.call(attrCtx) else attr
      return promise {remove: true} unless show

    if node.attributes?.view
      getBySpec(node.attributes.view.value)
        .then (viewCls) ->
          if viewCls == undefined
            throw new Error("can't find view class by #{node.attributes.view.value}")
          {viewParams, viewId} = consumeViewParams(context, node)
          view = new viewCls(viewParams)
          view.render()
          context.addView(view, viewId) if context.addView
          return {remove: false}

    else
      promise {remove: false}

  consumeViewParams = (context, node) ->
    viewParams = {}
    viewId = undefined
    for a in node.attributes when a.name.slice(0, 5) == 'view-'
      attrName = hypensToCamelCase(a.name.slice(5))

      if attrName == 'id'
        viewId = a.value

      {attr, attrCtx} = getByPath(context, a.value)
      viewParams[attrName] = if jQuery.isFunction(attr)
        attr.call(attrCtx)
      else if attr == undefined
        a.value
      else
        attr
    viewParams.el = node
    {viewParams, viewId}

  wrapTemplate = (template, requireSingleNode = false) ->
    nodes = if template.jquery
      template.clone()
    else if typeof template.cloneNode == 'function'
      [template.cloneNode(true)]
    else
      jQuery.parseHTML(template)
    if requireSingleNode and nodes.length != 1
      throw new Error('templates only of single element are allowed')
    if nodes.length > 1 or nodes[0].nodeType == 3
      fragment = document.createDocumentFragment()
      for node in nodes
        fragment.appendChild(node)
      fragment
    else
      nodes[0]

  makeContext = (o, overlays...) ->
    Object.create(_.extend(Object.create(o), overlays...))

  class View extends Backbone.View

    template: undefined
    templateCached: undefined

    @from: (template, options) ->
      node = wrapTemplate(template, true)
      view = new this(el: node)
      render(view, node).then ->
        view.render()
        view

    constructor: ->
      super
      this.views = []

    processDOM: (template, localContext) ->
      node = wrapTemplate(template)
      render(this, node, localContext)

    renderDOM: (template, localContext) ->
      this.processDOM(template, localContext).then (node) =>
        this.$el.append(node)
        this

    addView: (view, viewId) ->
      this.views.push(view)
      this[viewId] = view if viewId

    remove: ->
      super
      for view in this.views
        view.remove()

    render: (localContext) ->
      return unless this.template
      if this.hasOwnProperty('template')
        this.renderDOM(this.template, localContext)
      else
        if this.constructor::templateCached == undefined
          this.constructor::templateCached = wrapTemplate(this.constructor::template)
        this.renderDOM(this.constructor::templateCached, localContext)

  {View}
