const allConfig = {
  designLayoutWidth: 750, // 设计稿的宽度 | 默认750，如果开启 Zoom 则直接按照设计稿宽度和屏幕宽度进行缩放
  designLayoutHeight: 1206, // 设计稿的高度 | 默认1206，如果开启 Zoom 则直接按照设计稿高度和屏幕高度进行缩放
  baseZoomRuler: "width", // Zoom 缩放的基准 | 默认为 'width'，以屏幕的宽度进行缩放
  baseSize: 10, // 计算 rem 的基数，通常不用修改
  enableREM: true, // 是否用 rem 做适配
  enableZoom: true // 是否用 zoom 做适配
};

const headJavascript = `
<!-- begin REM Zoom 计算 -->
<script type="text/javascript">
  (function (win) {
    var remCalc = {};
    var docEl = win.document.documentElement,
      tid,
      hasRem = ${allConfig.enableREM},
      hasZoom = ${allConfig.enableZoom},
      zoomRuler = '${allConfig.baseZoomRuler}',
      designWidth = ${allConfig.designLayoutWidth},
      designHeight = ${allConfig.designLayoutHeight};
    function refresh() {
      var width = docEl.clientWidth;
      var height = docEl.clientHeight;
      console.log(width,height)
      if (width > 768) width = 768;
      if (hasRem) {
        var rem = width / ${allConfig.baseSize};
        docEl.style.fontSize = rem + "px";
        remCalc.rem = rem;
        var actualSize = parseFloat(window.getComputedStyle(document.documentElement)["font-size"]);
        if (actualSize !== rem && actualSize > 0 && Math.abs(actualSize - rem) > 1) {
          var remScaled = rem * rem / actualSize;
          docEl.style.fontSize = remScaled + "px";
        }
      }
      if (hasZoom) {
        var style = document.getElementById('J__style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'J__style';
        }
        var r,s;
        if (zoomRuler === 'height') {
          r = height / designHeight;
        } else {
          r = width / designWidth;
        }
        r.toFixed && (r = r.toFixed(5));
        s = '.__z{zoom:' + r + '} ';
        s += '.__s{-webkit-transform: scale(' + r + ');transform: scale(' + r + ')}';
        style.innerHTML = s;
        document.getElementsByTagName('head')[0].appendChild(style);
      }
    }
    function dbcRefresh() {
      refresh()
    }
    win.addEventListener("resize", function () {
      dbcRefresh()
    }, false);
    win.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        dbcRefresh();
      }
    }, false);
    refresh();
    if (hasRem) {
      remCalc.refresh = refresh;
      remCalc.rem2px = function (d) {
        var val = parseFloat(d) * this.rem;
        if (typeof d === "string" && d.match(/rem$/)) {
          val += "px";
        }
        return val;
      };
      remCalc.px2rem = function (d) {
        var val = parseFloat(d) / this.rem;
        if (typeof d === "string" && d.match(/px$/)) {
          val += "rem";
        }
        return val;
      };
      win.remCalc = remCalc;
    }
  })(window);
</script>
<!-- end REM Zoom 计算 -->
`;

function HelloWorldPlugin(options) {
  console.log("Hello");
  // 使用 options 设置插件实例……
}

HelloWorldPlugin.prototype.apply = function(compiler) {
  compiler.plugin("compilation", function(compilation) {
    compilation.plugin("html-webpack-plugin-before-html-processing", function(
      htmlPluginData,
    ) {
      let html = htmlPluginData.html;
      html = html.replace("{{{__HEAD_JAVASCRIPT__}}}", headJavascript);
      htmlPluginData.html = html;
    });
  });
};

module.exports = HelloWorldPlugin;
