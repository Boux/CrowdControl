<script>
import {
  ArrowLeft, X, EllipsisVertical, RefreshCw, Move,
  SlidersVertical, Circle, ToggleLeft, ChevronDown, ChevronUp, Plus
} from "lucide-vue-next"

const icons = {
  "arrow-left": ArrowLeft,
  "x": X,
  "plus": Plus,
  "ellipsis-vertical": EllipsisVertical,
  "refresh-cw": RefreshCw,
  "move": Move,
  "sliders-vertical": SlidersVertical,
  "circle": Circle,
  "toggle-left": ToggleLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp
}

export default {
  name: "Icon",
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 20 }
  },
  computed: {
    component() { return icons[this.name] }
  }
}
</script>

<template>
  <component :is='component' :size='size' v-if='component' />
</template>
