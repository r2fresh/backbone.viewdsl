// Generated by CoffeeScript 1.4.0
var __slice = [].slice,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    return define(['jquery', 'backbone', 'underscore'], function(jQuery, Backbone, _) {
      jQuery = jQuery || root.jQuery;
      Backbone = Backbone || root.Backbone;
      _ = _ || root._;
      return root.Backbone.ViewDSL = factory(jQuery, Backbone, _);
    });
  } else {
    return root.Backbone.ViewDSL = factory(root.jQuery, root.Backbone, root._);
  }
})(this, function(jQuery, Backbone, _) {
  var Promise, View, consumeViewParams, getByPath, getBySpec, hypensToCamelCase, instantiateView, join, makeContext, process, processAttributes, processNode, processTextNode, promise, promiseRequire, render, replaceChild, textNodeSplitRe, toArray, wrapTemplate;
  Promise = (function() {
    var invokeCallback, noop, reject, resolve;

    noop = function() {};

    resolve = function(promise, value) {
      promise.trigger('promise:resolved', {
        detail: value
      });
      promise.isResolved = true;
      return promise.resolvedValue = value;
    };

    reject = function(promise, value) {
      promise.trigger('promise:failed', {
        detail: value
      });
      promise.isRejected = true;
      return promise.rejectedValue = value;
    };

    invokeCallback = function(type, promise, callback, event) {
      var error, failed, hasCallback, succeeded, value;
      hasCallback = typeof callback === 'function';
      if (hasCallback) {
        try {
          value = callback(event.detail);
          succeeded = true;
        } catch (e) {
          throw e;
          failed = true;
          error = e;
        }
      } else {
        value = event.detail;
        succeeded = true;
      }
      if (value && typeof value.then === 'function') {
        return value.then((function(value) {
          return promise.resolve(value);
        }), (function(value) {
          return promise.reject(value);
        }));
      } else if (hasCallback && succeeded) {
        return promise.resolve(value);
      } else if (failed) {
        return promise.reject(error);
      } else {
        return promise[type](value);
      }
    };

    function Promise() {
      var _this = this;
      this.on('promise:resolved', function(e) {
        return _this.trigger('success', {
          detail: e.detail
        });
      });
      this.on('promise:failed', function(e) {
        return _this.trigger('error', {
          detail: event.detail
        });
      });
    }

    Promise.prototype.then = function(done, fail) {
      var thenPromise;
      thenPromise = new Promise();
      if (this.isResolved) {
        invokeCallback('resolve', thenPromise, done, {
          detail: this.resolvedValue
        });
      }
      if (this.isRejected) {
        invokeCallback('reject', thenPromise, fail, {
          detail: this.rejectedValue
        });
      }
      this.on('promise:resolved', function(event) {
        return invokeCallback('resolve', thenPromise, done, event);
      });
      this.on('promise:failed', function(event) {
        return invokeCallback('reject', thenPromise, fail, event);
      });
      return thenPromise;
    };

    Promise.prototype.resolve = function(value) {
      resolve(this, value);
      this.resolve = noop;
      return this.reject = noop;
    };

    Promise.prototype.reject = function(value) {
      reject(this, value);
      this.resolve = noop;
      return this.reject = noop;
    };

    return Promise;

  })();
  _.extend(Promise.prototype, Backbone.Events);
  Promise.prototype.end = function() {
    return this.then(void 0, function(e) {
      throw e;
    });
  };
  toArray = function(o) {
    return Array.prototype.slice.call(o);
  };
  getByPath = function(o, p, callIfMethod) {
    var ctx, n, _i, _len, _ref;
    if (callIfMethod == null) {
      callIfMethod = false;
    }
    if (p.trim().length === 0) {
      return [o, window];
    }
    _ref = p.split('.');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      ctx = o;
      o = ctx[n];
      if (o === void 0) {
        break;
      }
    }
    if (callIfMethod && jQuery.isFunction(o)) {
      o = o.call(ctx);
    }
    return {
      attr: o,
      attrCtx: ctx
    };
  };
  getBySpec = function(spec, context) {
    var module, path, _ref;
    if (context == null) {
      context = window;
    }
    if (/:/.test(spec)) {
      _ref = spec.split(':', 2), module = _ref[0], path = _ref[1];
      return promiseRequire(module).then(function(module) {
        return getByPath(module, path).attr;
      });
    } else if (spec && spec[0] === '@') {
      return promise(getByPath(context, spec.slice(1)).attr);
    } else {
      return promise(getByPath(window, spec).attr);
    }
  };
  promise = function(value) {
    var p;
    p = new Promise();
    p.resolve(value);
    return p;
  };
  join = function(promises) {
    var idx, p, pr, results, resultsToGo, _fn, _i, _len,
      _this = this;
    p = new Promise();
    results = [];
    if (promises.length > 0) {
      resultsToGo = promises.length;
      _fn = function(pr, idx) {
        return pr.then(function(result) {
          results[idx] = result;
          resultsToGo = resultsToGo - 1;
          if (resultsToGo === 0) {
            return p.resolve(results);
          }
        });
      };
      for (idx = _i = 0, _len = promises.length; _i < _len; idx = ++_i) {
        pr = promises[idx];
        _fn(pr, idx);
      }
    } else {
      p.resolve(results);
    }
    return p;
  };
  promiseRequire = function(moduleName) {
    var p;
    p = new Promise();
    require([moduleName], function(module) {
      return p.resolve(module);
    });
    return p;
  };
  hypensToCamelCase = function(o) {
    return o.replace(/-([a-z])/g, function(g) {
      return g[1].toUpperCase();
    });
  };
  replaceChild = function() {
    var m, n, ns, o, p, _i, _j, _len, _len1;
    o = arguments[0], ns = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    p = o.parentNode;
    for (_i = 0, _len = ns.length; _i < _len; _i++) {
      n = ns[_i];
      if (typeof n.cloneNode === 'function') {
        p.insertBefore(n, o);
      } else if (typeof n.item === 'function' && n.length || n.jquery) {
        for (_j = 0, _len1 = n.length; _j < _len1; _j++) {
          m = n[_j];
          p.insertBefore(m, o);
        }
      } else {
        p.insertBefore(document.createTextNode(String(n)), o);
      }
    }
    p.removeChild(o);
    return ns;
  };
  render = function() {
    var context, node, overlays, synContext;
    context = arguments[0], node = arguments[1], overlays = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    synContext = makeContext.apply(null, [context].concat(__slice.call(overlays)));
    return process(synContext, node).then(function(result) {
      var prop;
      for (prop in synContext) {
        if (synContext.hasOwnProperty(prop)) {
          context[prop] = synContext[prop];
        }
      }
      return result;
    });
  };
  process = function(context, node) {
    return processAttributes(context, node).then(function(pragmas) {
      if (pragmas.remove && node.parentNode) {
        node.parentNode.removeChild(node);
        return promise;
      } else {
        return processNode(context, node);
      }
    });
  };
  processNode = function(context, node) {
    var n, nodes, spec, viewId, viewParams, _ref;
    if (node.nodeType === 3) {
      nodes = processTextNode(context, node);
      if (nodes) {
        node = replaceChild.apply(null, [node].concat(__slice.call(nodes)));
      }
      return promise(node);
    } else if (node.tagName === 'VIEW') {
      if (!node.attributes.name) {
        throw new Error('<view> element should have a name attribute');
      }
      spec = node.attributes.name.value;
      node.removeAttribute('name');
      _ref = consumeViewParams(context, node), viewParams = _ref.viewParams, viewId = _ref.viewId;
      return instantiateView(context, spec, viewParams, viewId).then(function(view) {
        return replaceChild(node, view.el);
      });
    } else {
      return join((function() {
        var _i, _len, _ref1, _results;
        _ref1 = toArray(node.childNodes);
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          n = _ref1[_i];
          _results.push(process(context, n));
        }
        return _results;
      })()).then(function() {
        return node;
      });
    }
  };
  textNodeSplitRe = /({{)|(}})/;
  processTextNode = function(context, node) {
    var data, part, parts, _i, _len, _results;
    if (!textNodeSplitRe.test(node.data)) {
      return;
    }
    data = node.data;
    data = data.replace(/{{/g, '{{\uF001');
    parts = data.split(textNodeSplitRe);
    parts = parts.filter(function(e) {
      return e && e !== '{{' && e !== '}}';
    });
    _results = [];
    for (_i = 0, _len = parts.length; _i < _len; _i++) {
      part = parts[_i];
      if (part[0] === '\uF001') {
        _results.push(getByPath(context, part.slice(1).trim(), true).attr || '');
      } else {
        _results.push(part);
      }
    }
    return _results;
  };
  processAttributes = function(context, node) {
    var show, viewId, viewParams, _ref, _ref1, _ref2;
    if ((_ref = node.attributes) != null ? _ref["if"] : void 0) {
      show = getByPath(context, node.attributes["if"].value, true).attr;
      if (!show) {
        return promise({
          remove: true
        });
      }
    }
    if ((_ref1 = node.attributes) != null ? _ref1.view : void 0) {
      _ref2 = consumeViewParams(context, node, 'view-'), viewParams = _ref2.viewParams, viewId = _ref2.viewId;
      return instantiateView(context, node.attributes.view.value, viewParams, viewId, node).then(function() {
        return {
          remove: false
        };
      });
    } else {
      return promise({
        remove: false
      });
    }
  };
  instantiateView = function(context, spec, params, id, node) {
    return getBySpec(spec, context).then(function(viewCls) {
      var view;
      if (viewCls === void 0) {
        throw new Error("can't find a view by '" + spec + "' spec");
      }
      view = jQuery.isFunction(viewCls) ? (node ? params.el = node : void 0, new viewCls(params)) : (node ? viewCls.setElement(node) : void 0, viewCls);
      view.render();
      if (context.addView) {
        context.addView(view, id);
      }
      return view;
    });
  };
  consumeViewParams = function(context, node, prefix) {
    var a, attrName, viewId, viewParams, _i, _len, _ref;
    viewParams = {};
    viewId = void 0;
    _ref = node.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      a = _ref[_i];
      if (!(prefix && a.name.slice(0, prefix.length) === prefix || !prefix)) {
        continue;
      }
      attrName = prefix ? a.name.slice(prefix.length) : a.name;
      attrName = hypensToCamelCase(attrName);
      if (attrName === 'id') {
        viewId = a.value;
      }
      viewParams[attrName] = getByPath(context, a.value, true).attr || a.value;
    }
    return {
      viewParams: viewParams,
      viewId: viewId
    };
  };
  wrapTemplate = function(template, requireSingleNode) {
    var fragment, node, nodes, _i, _len;
    if (requireSingleNode == null) {
      requireSingleNode = false;
    }
    nodes = template.jquery ? template.clone() : typeof template.cloneNode === 'function' ? [template.cloneNode(true)] : jQuery.parseHTML(template);
    if (requireSingleNode && nodes.length !== 1) {
      throw new Error('templates only of single element are allowed');
    }
    if (nodes.length > 1 || nodes[0].nodeType === 3) {
      fragment = document.createDocumentFragment();
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        fragment.appendChild(node);
      }
      return fragment;
    } else {
      return nodes[0];
    }
  };
  makeContext = function() {
    var o, overlays;
    o = arguments[0], overlays = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Object.create(_.extend.apply(_, [Object.create(o)].concat(__slice.call(overlays))));
  };
  View = (function(_super) {

    __extends(View, _super);

    View.prototype.template = void 0;

    View.prototype.templateCached = void 0;

    View.from = function(template, options) {
      var node, view;
      node = wrapTemplate(template, true);
      view = new this({
        el: node
      });
      return render(view, node).then(function() {
        view.render();
        return view;
      });
    };

    function View() {
      View.__super__.constructor.apply(this, arguments);
      this.views = [];
    }

    View.prototype.renderDOM = function(template, localContext) {
      var node,
        _this = this;
      node = wrapTemplate(template);
      return render(this, node, localContext).then(function(node) {
        _this.$el.append(node);
        return _this;
      });
    };

    View.prototype.addView = function(view, viewId) {
      this.views.push(view);
      if (viewId) {
        return this[viewId] = view;
      }
    };

    View.prototype.remove = function() {
      var view, _i, _len, _ref, _results;
      View.__super__.remove.apply(this, arguments);
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.remove());
      }
      return _results;
    };

    View.prototype.render = function(localContext) {
      if (!this.template) {
        return;
      }
      if (this.hasOwnProperty('template')) {
        return this.renderDOM(this.template, localContext);
      } else {
        if (this.constructor.prototype.templateCached === void 0) {
          this.constructor.prototype.templateCached = wrapTemplate(this.constructor.prototype.template);
        }
        return this.renderDOM(this.constructor.prototype.templateCached, localContext);
      }
    };

    return View;

  })(Backbone.View);
  return {
    View: View
  };
});
