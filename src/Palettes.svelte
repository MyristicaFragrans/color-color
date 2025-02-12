<style lang="postcss">
  .palettes {
    @apply grid overflow-y-auto overflow-x-hidden;
    @apply border-4 border-l-0 border-gray-900;
    grid-template-columns: repeat(var(--columns), 1fr) max-content;
    grid-area: var(--grid-area);
    scroll-snap-align: start;

    @screen md {
      @apply overflow-x-auto;
    }
  }

  .ids {
    @apply flex flex-col;
  }

  .ids__header {
    @apply sticky top-0 z-10 h-16 flex-none flex bg-gray-200;
  }

  button {
    @apply flex flex-col flex-1 border-t px-2 py-3 text-gray-600;
  }

  button:hover,
  button:active,
  button:focus {
    @apply bg-gray-300;
  }

  .button-label {
    @apply relative block px-3 py-1 font-bold bg-transparent rounded-full;
  }

  .button-label--active {
    @apply text-gray-200 bg-gray-900;
  }

  .button-label--active:after {
    @apply block absolute w-5 h-1 bg-gray-900;
    left: 100%;
    top: 50%;
    margin-top: -0.125rem;
    content: "";
  }
</style>

<script>
  import {
    paletteParams,
    palettes,
    nearestRefColors,
    refColors,
  } from "./store";
  import Palette from "./Palette.svelte";
  import Swatch from "./Swatch.svelte";

  export let gridArea;

  function confirmAndDelete(id) {
    if (window.confirm("Are you sure to delete it?")) {
      paletteParams.removeByIndex(id);
    }
  }

  function setCurrentIndices(paletteIndex, swatchIndex) {
    $paletteParams.paletteIndex = paletteIndex;
    $paletteParams.swatchIndex = swatchIndex;
  }

  const isLightColor = (lum) => lum > 0.55;

  $: canAddMoreColors =
    $paletteParams.params.length < $paletteParams.maxNumOfPalettes;
</script>

<div
  class="palettes"
  style="--grid-area: {gridArea}; --columns:{$palettes.length};"
>
  {#each $palettes as palette, j (j)}
    <Palette
      active="{$paletteParams.paletteIndex === j}"
      index="{j + 1}"
      on:clickActivate="{() => {
        $paletteParams.paletteIndex = j;
      }}"
      on:clickRemove="{() => {
        confirmAndDelete(j);
      }}"
      on:clickClone="{() => {
        paletteParams.cloneByIndex(j);
      }}"
      clonable="{canAddMoreColors}"
      removable="{$palettes.length > 1}"
    >
      {#each palette as color, i (i)}
        <Swatch
          fillHeight
          isLight="{isLightColor(color.luminance)}"
          hexCode="{color.hex}"
          rgbCode="{color.rgb}"
          whiteContrast="{color.whiteContrast}"
          blackContrast="{color.blackContrast}"
          refColor="{$nearestRefColors[color.hex]}"
          on:click="{(e) => {
            e.preventDefault();
            setCurrentIndices(j, i);
          }}"
        />
      {/each}
    </Palette>
  {/each}
  <div class="ids">
    <div class="ids__header">&nbsp;</div>
    {#each $palettes[0] as color, i (i)}
      <button
        on:click="{() => {
          $paletteParams.swatchIndex = i;
        }}"
      >
        <span
          class="button-label"
          class:button-label--active="{$paletteParams.swatchIndex === i}"
        >
          {color.id}
        </span>
      </button>
    {/each}
  </div>
</div>
