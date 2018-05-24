/**
Page 组件参考了滴滴 CubeUI 的 Scroll 组件（https://didi.github.io/cube-ui/#/zh-CN/docs/scroll），同时使用有赞 Vant 的 NavBar 组件分装;
Page 组件自带了「下拉刷新」及「上拉加载更多」功能，功能使用参考上面链接 Scroll 组件的使用，使用该功能时须传入 data 帮助 Scroll 判断是否有数据更新；
*/
<template>
  <div class="page" :class="{'page__hasNavBar':hasNavBar&&!hasBottomBar,'page__hasBottomBar':!hasNavBar&&hasBottomBar,'page__hasBothBar':hasNavBar&&hasBottomBar}">
    <div ref="wrapper" class="cube-scroll-wrapper">
      <div class="cube-scroll-content" v-show="(!showLoading || !isLoading) && !isError">
        <div ref="listWrapper" class="cube-scroll-list-wrapper">
          <slot> </slot>
          <slot name="pullup" :pullUpLoad="pullUpLoad" :isPullUpLoad="isPullUpLoad">
            <div class="cube-pullup-wrapper" v-if="pullUpLoad">
              <div class="before-trigger" v-if="!isPullUpLoad">
                <span>{{ pullUpTxt }}</span>
              </div>
            </div>
          </slot>
        </div>
      </div>
      <slot name="pulldown" :pullDownRefresh="pullDownRefresh" :pullDownStyle="pullDownStyle" :beforePullDown="beforePullDown" :isPullingDown="isPullingDown" :bubbleY="bubbleY">
        <div class="cube-pulldown-wrapper" :style="pullDownStyle" v-if="pullDownRefresh">
          <div class="before-trigger" v-if="beforePullDown">
            <div>你关心的，我都知道 ：)</div>
          </div>
          <div class="after-trigger" v-else>
            <div v-if="isPullingDown" class="loading">
              加载中
            </div>
            <div v-else>
              <span>{{ refreshTxt }}</span>
            </div>
          </div>
        </div>
      </slot>
    </div>
    <slot name="bottom-bar"></slot>
  </div>
</template>

<script>
import BScroll from "better-scroll";

const DIRECTION_H = "horizontal";
const DIRECTION_V = "vertical";
const DEFAULT_REFRESH_TXT = "刷新成功";
const PULL_DOWN_ELEMENT_INITIAL_HEIGHT = -50;
const EVENT_SCROLL = "scroll";
const EVENT_BEFORE_SCROLL_START = "before-scroll-start";
const EVENT_CLICK = "click";
const EVENT_PULLING_DOWN = "pulling-down";
const EVENT_PULLING_UP = "pulling-up";
const DEFAULT_OPTIONS = {
  observeDOM: true,
  click: false,
  probeType: 1,
  scrollbar: {
    fade: true
  },
  eventPassthrough: "horizontal",
  pullDownRefresh: false,
  pullUpLoad: false
};

export default {
  name: "Page",
  props: {
    title: {
      type: String,
      default() {
        return "";
      }
    },
    hasNavBar: {
      type: Boolean,
      default() {
        return true;
      }
    },
    hasBottomBar: {
      type: Boolean,
      default() {
        return false;
      }
    },
    data: {
      type: Array,
      default() {
        return [];
      }
    },
    options: {
      type: Object,
      default() {
        return {};
      }
    },
    listenScroll: {
      type: Boolean,
      default: false
    },
    listenBeforeScroll: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      default: DIRECTION_V
    },
    refreshDelay: {
      type: Number,
      default: 20
    },
    allLoaded: {
      type: Boolean,
      default: false
    },
    titleType: String,
    showLoading: {
      type: Boolean,
      default: false
    },
    shareOptions: Object
  },
  data() {
    return {
      beforePullDown: true,
      isPullingDown: false,
      isPullUpLoad: false,
      pullUpDirty: true,
      bubbleY: 0,
      scrollY: 0,
      pullDownStyle: ""
    };
  },
  computed: {
    isError() {
      return this.$store.state.isError;
    },
    isLoading() {
      return this.$store.state.isLoading;
    },
    pullDownRefresh() {
      return this.options.pullDownRefresh;
    },
    pullUpLoad() {
      return this.options.pullUpLoad;
    },
    startY() {
      return this.options.startY || 0;
    },
    pullUpTxt() {
      const pullUpLoad = this.pullUpLoad;
      const txt = pullUpLoad && pullUpLoad.txt;
      const moreTxt = (txt && txt.more) || "";
      const noMoreTxt = (txt && txt.noMore) || "";
      // return this.pullUpDirty ? moreTxt : noMoreTxt
      return !this.allLoaded ? moreTxt : noMoreTxt;
    },
    refreshTxt() {
      const pullDownRefresh = this.pullDownRefresh;
      return (pullDownRefresh && pullDownRefresh.txt) || DEFAULT_REFRESH_TXT;
    }
  },
  watch: {
    data() {
      setTimeout(() => {
        this.forceUpdate(true);
      }, this.refreshDelay);
    },
    pullDownRefresh: {
      handler(newVal, oldVal) {
        if (newVal) {
          this.scroll.openPullDown(newVal);
          if (!oldVal) {
            this._onPullDownRefresh();
            this._calculateMinHeight();
          }
        }
        if (!newVal && oldVal) {
          this.scroll.closePullDown();
          this._offPullDownRefresh();
          this._calculateMinHeight();
        }
      },
      deep: true
    },
    pullUpLoad: {
      handler(newVal, oldVal) {
        if (newVal) {
          this.scroll.openPullUp(newVal);
          if (!oldVal) {
            this._onPullUpLoad();
            this._calculateMinHeight();
          }
        }
        if (!newVal && oldVal) {
          this.scroll.closePullUp();
          this._offPullUpLoad();
          this._calculateMinHeight();
        }
      },
      deep: true
    },
    startY: {
      handler(newVal, oldVal) {
        this.scrollTo(0, newVal);
      },
      deep: true
    }
  },
  activated() {
    /* istanbul ignore next */
    this.enable();
    // 修复加载更多时跳出页面再回来无法滚动的 bug
    this.forceUpdate(true);
    // 修复加载更多时跳出页面再回来，滚动位置不对的 bug
    this.scrollTo(0, this.scrollY);
  },
  deactivated() {
    /* istanbul ignore next */
    this.disable();
  },
  mounted() {
    this.$nextTick(() => {
      this.initScroll();
      this._pullUpHandle();
    });
  },
  beforeDestroy() {
    this.destroy();
  },
  methods: {
    initScroll() {
      if (!this.$refs.wrapper) {
        return;
      }
      this._calculateMinHeight();
      let options = Object.assign(
        {},
        DEFAULT_OPTIONS,
        {
          scrollY: this.direction === DIRECTION_V,
          scrollX: this.direction === DIRECTION_H
        },
        this.options
      );
      if (this.listenScroll) {
        options.probeType = 3;
      }
      this.scroll = new BScroll(this.$refs.wrapper, options);
      if (this.listenScroll) {
        this.scroll.on("scroll", pos => {
          this.$emit(EVENT_SCROLL, pos);
        });
      }
      if (this.listenBeforeScroll) {
        this.scroll.on("beforeScrollStart", () => {
          this.$emit(EVENT_BEFORE_SCROLL_START);
        });
      }
      if (this.pullDownRefresh) {
        this._onPullDownRefresh();
      }
      if (this.pullUpLoad) {
        this._onPullUpLoad();
      }
    },
    disable() {
      this.scroll && (this.scrollY = this.scroll.y) && this.scroll.disable();
    },
    enable() {
      this.scroll && this.scroll.enable();
    },
    refresh() {
      this._calculateMinHeight();
      this.scroll && this.scroll.refresh();
    },
    destroy() {
      this.scroll && this.scroll.destroy();
      this.scroll = null;
    },
    scrollTo() {
      this.scroll && this.scroll.scrollTo.apply(this.scroll, arguments);
    },
    scrollToElement() {
      this.scroll && this.scroll.scrollToElement.apply(this.scroll, arguments);
    },
    clickItem(item) {
      this.$emit(EVENT_CLICK, item);
    },
    forceUpdate(dirty = false) {
      if (this.pullDownRefresh && this.isPullingDown) {
        this.isPullingDown = false;
        this._reboundPullDown().then(() => {
          this._afterPullDown(dirty);
        });
      } else if (this.pullUpLoad && this.isPullUpLoad) {
        this.isPullUpLoad = false;
        this.scroll.finishPullUp();
        this.pullUpDirty = !this.allLoaded;
        dirty && this.refresh();
        this.scroll &&
          console.log(
            "pullUpLoad-forceUpdate",
            this.$refs.listWrapper.offsetHeight,
            this.scroll.enabled,
            this.scroll.y
          );
      } else {
        dirty && this.refresh();
        this.scroll &&
          console.log(
            "forceUpdate",
            this.$refs.listWrapper.offsetHeight,
            this.scroll.enabled,
            this.scroll.y
          );
      }
    },
    resetPullUpTxt() {
      this.pullUpDirty = true;
    },
    _calculateMinHeight() {
      if (this.$refs.listWrapper) {
        this.$refs.listWrapper.style.minHeight = `${this.$refs.wrapper
          .offsetHeight + 1}px`;
      }
    },
    _onPullDownRefresh() {
      this.scroll.on("pullingDown", this._pullDownHandle);
      this.scroll.on("scroll", this._pullDownScrollHandle);
    },
    _offPullDownRefresh() {
      this.scroll.off("pullingDown", this._pullDownHandle);
      this.scroll.off("scroll", this._pullDownScrollHandle);
    },
    _pullDownHandle() {
      this.beforePullDown = false;
      this.isPullingDown = true;
      this.$emit(EVENT_PULLING_DOWN);
    },
    _pullDownScrollHandle(pos) {
      if (this.beforePullDown) {
        this.bubbleY = Math.max(0, pos.y + PULL_DOWN_ELEMENT_INITIAL_HEIGHT);
        this.pullDownStyle = `top:${Math.min(
          pos.y + PULL_DOWN_ELEMENT_INITIAL_HEIGHT,
          10
        )}px`;
      } else {
        this.bubbleY = 0;
        this.pullDownStyle = `top:${Math.min(pos.y - 30, 10)}px`;
      }
    },
    _onPullUpLoad() {
      this.scroll.on("pullingUp", this._pullUpHandle);
    },
    _offPullUpLoad() {
      this.scroll.off("pullingUp", this._pullUpHandle);
    },
    _pullUpHandle() {
      this.isPullUpLoad = true;
      this.$emit(EVENT_PULLING_UP);
    },
    _reboundPullDown() {
      const { stopTime = 600 } = this.pullDownRefresh;
      return new Promise(resolve => {
        setTimeout(() => {
          this.scroll.finishPullDown();
          this.isPullingDown = false;
          resolve();
        }, stopTime);
      });
    },
    _afterPullDown(dirty) {
      setTimeout(() => {
        this.pullDownStyle = `top:${PULL_DOWN_ELEMENT_INITIAL_HEIGHT}px`;
        this.beforePullDown = true;
        dirty && this.refresh();
      }, this.scroll.options.bounceTime);
    },
    refreshPage() {
      window.location.reload();
    }
  },
  components: {}
};
</script>

<style lang="less">
.page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  background: #ececee;
  height: 100vh;
  .bscroll-vertical-scrollbar {
    width: 4px !important;
  }
  .cube-scroll-wrapper {
    position: relative;
    height: 100vh;
    overflow: hidden;
    .cube-pulldown-wrapper {
      position: absolute;
      width: 100%;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all;
      color: #999999;
      font-size: 12px;
    }
    .cube-pullup-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-bottom: 10px;
      .after-trigger {
        padding: 15px 0;
      }
    }
    .before-trigger {
      padding: 22px 15px;
      min-height: 1em;
      font-size: 13px;
      color: #999999;
    }
    .cube-scroll-content {
      position: relative;
      z-index: 1;
    }
    .cube-scroll-item {
      height: 60px;
      line-height: 60px;
      font-size: 14px;
      padding-left: 20px;
    }
  }
  &__hasNavBar {
    .cube-scroll-wrapper {
      height: calc(~"100vh - 46px");
    }
  }
  &__hasBottomBar {
    .cube-scroll-wrapper {
      height: calc(~"100vh - 50px");
    }
  }
  &__hasBothBar {
    .cube-scroll-wrapper {
      height: calc(~"100vh - 96px");
    }
  }
}
.error,
.loading {
  position: fixed;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-direction: column;
  .icon {
    margin-bottom: 20px;
  }
  .loading-box {
    padding-bottom: 100px;
  }
}
</style>
