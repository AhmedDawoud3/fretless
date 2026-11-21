import { expect, test } from "vitest";
import { type ScrollBox, type ScrollTarget, scrollWithinContainer } from "./scrollContainer";

function makeBox(opts: {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  scrollTop?: number;
  scrollLeft?: number;
}): ScrollBox {
  const top = opts.top ?? 0;
  const left = opts.left ?? 0;
  const width = opts.width ?? 400;
  const height = opts.height ?? 200;
  return {
    scrollTop: opts.scrollTop ?? 0,
    scrollLeft: opts.scrollLeft ?? 0,
    clientWidth: width,
    clientHeight: height,
    getBoundingClientRect: () => ({
      top,
      bottom: top + height,
      left,
      right: left + width,
      width,
      height,
    }),
  };
}

function makeTarget(top: number, bottom: number, left = 40, right = 80): ScrollTarget {
  return {
    getBoundingClientRect: () => ({
      top,
      bottom,
      left,
      right,
      width: right - left,
      height: bottom - top,
    }),
  };
}

test("scrollWithinContainer scrolls only the container down and up when target leaves vertical bounds", () => {
  const box = makeBox({ top: 100, height: 200, scrollTop: 50 });
  scrollWithinContainer(box, makeTarget(320, 340), 28);
  // Visible bottom threshold inside container is 100 + 200 - 28 = 272; target bottom 340 -> +68
  expect(box.scrollTop).toBe(118);

  scrollWithinContainer(box, makeTarget(80, 100), 28);
  // Top threshold is 100 + 28 = 128; target top 80 -> -48
  expect(box.scrollTop).toBe(70);
});

test("scrollWithinContainer adjusts horizontal scroll when target overflows left or right", () => {
  const box = makeBox({ left: 20, width: 300, scrollLeft: 100 });
  scrollWithinContainer(box, makeTarget(40, 60, 310, 340), 24);
  // Right threshold: 20 + 300 - 24 = 296; target right 340 -> +44
  expect(box.scrollLeft).toBe(144);

  scrollWithinContainer(box, makeTarget(40, 60, 10, 40), 24);
  // Left threshold: 20 + 24 = 44; target left 10 -> -34
  expect(box.scrollLeft).toBe(110);
});

test("scrollWithinContainer is a no-op when already visible, null, or zero-sized", () => {
  const visibleBox = makeBox({
    top: 0,
    height: 200,
    left: 0,
    width: 400,
    scrollTop: 30,
    scrollLeft: 15,
  });
  scrollWithinContainer(visibleBox, makeTarget(60, 90, 80, 120), 28);
  expect(visibleBox.scrollTop).toBe(30);
  expect(visibleBox.scrollLeft).toBe(15);

  const hiddenBox = makeBox({ width: 0, height: 0, scrollTop: 12 });
  scrollWithinContainer(hiddenBox, makeTarget(500, 520), 28);
  expect(hiddenBox.scrollTop).toBe(12);

  scrollWithinContainer(null, makeTarget(10, 20));
  scrollWithinContainer(visibleBox, null);
});
