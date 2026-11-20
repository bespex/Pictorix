/**
 * Plays a Web Animation and resolves when it is over. WebKitGTK does not always settle
 * `Animation.finished` (e.g. while the window is occluded), so a timer guarantees that a vote never
 * gets stuck behind an animation.
 */
export function play(
  element: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<Animation | null> {
  if (!element) return Promise.resolve(null);
  const animation = element.animate(keyframes, options);
  const total = Number(options.duration ?? 0) + Number(options.delay ?? 0) + 60;
  return Promise.race([
    animation.finished.then(
      () => animation,
      () => animation,
    ),
    new Promise<Animation>((resolve) => setTimeout(() => resolve(animation), total)),
  ]);
}
