import BezierEasing from "bezier-easing";
import { derived, readable, writable } from "svelte/store";
import { insert } from "./lib/array";
import {
  colorToString,
  contrast,
  createColor,
  createColorByHSL,
  distance,
  getChroma,
  getLuminance,
} from "./lib/colors";
import {
  eases,
  getBezierEasingByAlias,
  stringToCubicBezierParams,
} from "./lib/eases";
import { randomInt } from "./lib/math";
import { jsonToSvg } from "./lib/svg";
import { getStateFromUrl, getStatefulUrl } from "./lib/url";
import { to as convert } from "colorjs.io/fn";

const defaults = {
  steps: 9,
  saturationRate: 130,
};
const maxNumOfPalettes = 6;
const urlState = getStateFromUrl();

export const config = readable({
  eases: eases,
  resolution: 0.25,
  limits: {
    hue: [0, 360],
    sat: [0, 100],
    lig: [0, 100],
    rate: [0, 200],
  },
});

const shareDialogStoreCreator = (config) => {
  const { subscribe, set, update } = writable(config);

  const openWithTriggerRect = (rect) => {
    update((state) => {
      return {
        ...state,
        open: true,
        rect,
      };
    });
  };

  return {
    subscribe,
    set,
    update,
    openWithTriggerRect,
  };
};

export const shareDialog = shareDialogStoreCreator({ open: false });

export const settings = writable(
  Object.assign(
    {},
    {
      overlayContrast: false,
      overlayHex: true,
      overlayRgb: false,
      refColorsRaw: "",
      colorSpace: "okhsl",
    },
    urlState.settings
  )
);

function createPaletteParams() {
  const { subscribe, set, update } = writable(
    Object.assign(
      {},
      {
        steps: defaults.steps,
        paletteIndex: 0,
        swatchIndex: Math.floor(defaults.steps / 2),
        maxNumOfPalettes,
        params: [
          {
            hue: {
              start: 16,
              end: 27,
              ease: getBezierEasingByAlias("quadIn"),
              interpolateHueOver360: false,
            },
            sat: {
              start: 45,
              end: 88,
              ease: getBezierEasingByAlias("quadOut"),
              rate: defaults.saturationRate,
            },
            lig: {
              start: 98.75,
              end: 12,
              ease: "0.4,0.64,0.6,0.91",
            },
          },
          {
            hue: {
              start: 150,
              end: 139,
              ease: getBezierEasingByAlias("quadIn"),
              interpolateHueOver360: false,
            },
            sat: {
              start: 44,
              end: 81,
              ease: getBezierEasingByAlias("quadOut"),
              rate: defaults.saturationRate,
            },
            lig: {
              start: 99,
              end: 12,
              ease: "0.51,0.93,0.89,1",
            },
          },
          {
            hue: {
              start: 235,
              end: 250,
              ease: getBezierEasingByAlias("quadIn"),
              interpolateHueOver360: false,
            },
            sat: {
              start: 44,
              end: 81,
              ease: getBezierEasingByAlias("quadOut"),
              rate: 125,
            },
            lig: {
              start: 99,
              end: 12,
              ease: getBezierEasingByAlias("quadOut"),
            },
          },
        ],
      },
      urlState.paletteParams
    )
  );

  const removeByIndex = (index) =>
    update((pp) => {
      if (pp.params.length > 1) {
        pp.params = pp.params.filter((_, i) => i !== index);
        if (pp.paletteIndex >= index) {
          pp.paletteIndex = Math.max(pp.paletteIndex - 1, 0);
        }
      }
      return pp;
    });

  const add = () =>
    update((pp) => {
      if (pp.params.length < maxNumOfPalettes) {
        const hueRange = 20;
        const hue = randomInt(0, 360 - hueRange);

        const param = {
          hue: {
            start: hue,
            end: hue + hueRange,
            ease: getBezierEasingByAlias("quadIn"),
          },
          sat: {
            start: 60,
            end: 100,
            ease: getBezierEasingByAlias("quadOut"),
            rate: defaults.saturationRate,
          },
          lig: { start: 100, end: 5, ease: getBezierEasingByAlias("quadOut") },
        };

        pp.paletteIndex = pp.params.length;
        pp.params = [...pp.params, param];
      }

      return pp;
    });

  const cloneByIndex = (index) =>
    update((pp) => {
      if (pp.params.length < maxNumOfPalettes) {
        const nextParams = structuredClone(pp.params[index]);
        pp.params = insert(pp.params, index + 1, nextParams);
      }
      return pp;
    });
  const checkAndSet = (obj) => {
    const { swatchIndex, steps } = obj;

    if (swatchIndex >= steps) {
      obj.swatchIndex = steps - 1;
    }

    set(obj);
  };

  return {
    subscribe,
    set: checkAndSet,
    update,
    removeByIndex,
    add,
    cloneByIndex,
  };
}
export const paletteParams = createPaletteParams();

const easeSteps = (easeFn, currentStep, totalStep) =>
  easeFn(currentStep / totalStep) * currentStep;

const staticColors = {
  white: createColorByHSL(0, 1, 1),
  black: createColorByHSL(0, 0, 0),
};

export const palettes = derived(
  [paletteParams, settings],
  ([$paletteParams, $settings]) => {
    const steps = $paletteParams.steps;

    return $paletteParams.params.map((pal) => {
      const { hue, sat, lig } = pal;
      const interpolateHueOver360 =
        hue.interpolateHueOver360 && hue.start > hue.end;
      const hueEnd = interpolateHueOver360 ? 360 + hue.end : hue.end;

      const hUnit = (hueEnd - hue.start) / steps;
      const sUnit = (sat.end - sat.start) / steps;
      const lUnit = (lig.end - lig.start) / steps;

      const hueEaseFn = BezierEasing(...stringToCubicBezierParams(hue.ease));
      const satEaseFn = BezierEasing(...stringToCubicBezierParams(sat.ease));
      const ligEaseFn = BezierEasing(...stringToCubicBezierParams(lig.ease));

      const swatches = Array.from({ length: steps }).map((_, i) => {
        let h = hue.start + easeSteps(hueEaseFn, i + 1, steps) * hUnit;
        if (interpolateHueOver360) {
          h = h % 360;
        }

        let s = sat.start + easeSteps(satEaseFn, i + 1, steps) * sUnit;
        s = Math.min(100, s * (sat.rate / 100));

        const l = lig.start + easeSteps(ligEaseFn, i + 1, steps) * lUnit;

        const id = (i + 1) * (steps > 9 ? 10 : 100);
        const _color = createColorByHSL(h, s, l, $settings.colorSpace);
        const hex = colorToString(_color, "hex", "srgb");
        const rgb = convert(_color, "srgb", { inGamut: true }).coords
          .map(c => Math.floor(c * 255))
          .join(", ");
        const chroma = getChroma(_color);
        const luminance = getLuminance(_color);
        const whiteContrast = contrast(_color, staticColors.white);
        const blackContrast = contrast(_color, staticColors.black);
        const string = colorToString(_color, undefined, $settings.colorSpace);

        return {
          _color,
          id: id.toString(),
          h,
          s,
          l,
          hex,
          rgb,
          chroma,
          luminance,
          whiteContrast,
          blackContrast,
          string,
        };
      });

      return swatches;
    });
  }
);

export const swatchesGroupedById = derived([palettes], ([$palettes]) => {
  const groupedBySwatchId = $palettes
    .map((palette, i) => {
      return palette.map((swatch) => {
        const { id: swatchId, ...rest } = swatch;
        return {
          ...rest,
          paletteIndex: i,
          swatchId,
        };
      });
    })
    .flat()
    .reduce(
      (acc, swatch) => ({
        ...acc,
        [swatch.swatchId]: [
          ...(acc[swatch.swatchId] ? acc[swatch.swatchId] : []),
          swatch,
        ],
      }),
      {}
    );

  return Object.keys(groupedBySwatchId).reduce((acc, swatchId, i) => {
    acc[i] = groupedBySwatchId[swatchId];
    return acc;
  }, []);
});

const hexRe = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const refColors = derived(settings, ($settings) => {
  return $settings.refColorsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.match(hexRe) !== null)
    .map((hex) => {
      const _color = createColor(hex);
      return {
        _color,
        hex: colorToString(_color, "hex"),
        string: colorToString(_color, undefined, $settings.colorSpace),
      };
    });
});

export const nearestRefColors = derived(
  [refColors, palettes],
  ([$refColors, $palettes]) => {
    const refs = $refColors.reduce((acc, { hex }) => {
      return { ...acc, [hex]: {} };
    }, {});

    $refColors.forEach(({ _color: _rcColor, hex: rcHex }) => {
      $palettes.forEach((p) =>
        p.forEach((swatch) => {
          const { _color, hex } = swatch;
          const dist = distance(_rcColor, _color);
          if (refs[rcHex].hex === undefined || refs[rcHex].dist > dist) {
            refs[rcHex].hex = hex;
            refs[rcHex].dist = dist;
          }
        })
      );
    });

    const matchedSwatches = Object.keys(refs).reduce((acc, key) => {
      const { hex } = refs[key];

      return {
        [hex]: key,
        ...acc,
      };
    }, {});

    return matchedSwatches;
  }
);

const groupPalettesByName = (palettes) =>
  palettes.reduce((pacc, p, i) => {
    const palette = p.reduce((acc, s) => {
      return { ...acc, [s.id]: s.hex };
    }, {});
    return { ...pacc, [`color-${i + 1}`]: palette };
  }, {});

export const shareState = derived(
  [settings, paletteParams, palettes],
  ([$settings, $paletteParams, $palettes]) => {
    const state = {
      paletteParams: $paletteParams,
      settings: $settings,
    };

    const paletteGroup = groupPalettesByName($palettes);

    return {
      url: getStatefulUrl(state),
      json: JSON.stringify(paletteGroup, null, 2),
      svg: jsonToSvg(paletteGroup),
    };
  }
);
