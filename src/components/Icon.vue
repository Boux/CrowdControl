<script>
import {
  ArrowLeft, X, EllipsisVertical, RefreshCw, Move, SlidersVertical,
  Circle, ToggleLeft, ChevronDown, ChevronUp, Plus, Play, Settings,
  FolderOpen, Download, Upload, Send, Copy, Pencil, Trash2, UserX,
  Camera, LogIn, Shuffle, Check, Smartphone, Tablet, Monitor, Square
} from "lucide-vue-next"

const icons = {
  "arrow-left": ArrowLeft,
  "x": X,
  "plus": Plus,
  "play": Play,
  "settings": Settings,
  "folder-open": FolderOpen,
  "download": Download,
  "upload": Upload,
  "send": Send,
  "copy": Copy,
  "pencil": Pencil,
  "trash-2": Trash2,
  "user-x": UserX,
  "camera": Camera,
  "log-in": LogIn,
  "shuffle": Shuffle,
  "check": Check,
  "smartphone": Smartphone,
  "tablet": Tablet,
  "monitor": Monitor,
  "square": Square,
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
