import type { RANGE_NAMES } from './constants.js';
/** The loader always resolves; unavailable means the caller should fall back. */
export type PolyfillReadyState = 'native' | 'polyfilled' | 'unavailable';
export type TimelineAxis = ScrollAxis;
export type TimelineRangeName = (typeof RANGE_NAMES)[number];
/** Supported numeric operations, including the partial Typed OM implementation. */
interface NumericOperations {
    toString(): string;
    type?: (() => CSSNumericType) | undefined;
    to?: ((unit: string) => PolyfillUnitValue) | undefined;
    toSum?: ((...units: string[]) => PolyfillMathSum) | undefined;
}
export type PolyfillNumericValue = CSSNumericValue | PolyfillUnitValue | PolyfillMathValue;
export interface PolyfillUnitValue extends NumericOperations {
    value: number;
    readonly unit: string;
    type(): CSSNumericType;
    to(unit: string): PolyfillUnitValue;
    toSum(...units: string[]): PolyfillMathSum;
}
export type PolyfillNumericArray = ArrayLike<PolyfillNumericValue> & Iterable<PolyfillNumericValue>;
export interface PolyfillMathValue extends NumericOperations {
    readonly operator: CSSMathOperator;
}
export interface PolyfillMathSum extends PolyfillMathValue {
    readonly values: PolyfillNumericArray;
}
export interface PolyfillMathProduct extends PolyfillMathValue {
    readonly values: PolyfillNumericArray;
    type(): CSSNumericType;
    toSum(...units: string[]): PolyfillMathSum;
}
export interface PolyfillMathMinMax extends PolyfillMathValue {
    readonly values: PolyfillNumericArray;
}
export interface PolyfillMathUnary extends PolyfillMathValue {
    readonly value: PolyfillNumericValue;
    type(): CSSNumericType;
}
export interface PolyfillKeywordValue {
    value: string;
    toString(): string;
}
export type PolyfillNumberish = number | PolyfillNumericValue;
export type PolyfillInset = string | readonly (PolyfillNumericValue | PolyfillKeywordValue | 'auto')[];
export interface PolyfillScrollTimelineOptions {
    source?: Element | null | undefined;
    axis?: TimelineAxis | undefined;
}
export interface PolyfillViewTimelineOptions {
    subject?: Element | undefined;
    axis?: TimelineAxis | undefined;
    inset?: PolyfillInset | undefined;
}
export interface PolyfillScrollTimeline {
    readonly source: Element | null;
    readonly axis: TimelineAxis;
    readonly currentTime: PolyfillUnitValue | null;
    readonly duration: PolyfillUnitValue;
}
export interface PolyfillViewTimeline extends PolyfillScrollTimeline {
    readonly subject: Element | null;
    readonly startOffset: PolyfillUnitValue | null;
    readonly endOffset: PolyfillUnitValue | null;
}
export interface PolyfillRangeOffset {
    rangeName?: TimelineRangeName | undefined;
    offset?: PolyfillNumericValue | undefined;
}
export type PolyfillRangeInput = string | PolyfillNumericValue | PolyfillKeywordValue | PolyfillRangeOffset;
export type PolyfillTimeline = AnimationTimeline | PolyfillScrollTimeline;
export interface PolyfillAnimationOptions extends Omit<KeyframeAnimationOptions, 'timeline' | 'rangeStart' | 'rangeEnd' | 'duration'> {
    duration?: number | 'auto';
    timeline?: PolyfillTimeline | null | undefined;
    rangeStart?: PolyfillRangeInput | undefined;
    rangeEnd?: PolyfillRangeInput | undefined;
}
export interface PolyfillComputedTiming extends Omit<ComputedEffectTiming, 'localTime' | 'endTime' | 'activeDuration' | 'duration'> {
    localTime?: PolyfillNumberish | null | undefined;
    endTime?: PolyfillNumberish | undefined;
    activeDuration?: PolyfillNumberish | undefined;
    duration?: number | string | PolyfillNumericValue | undefined;
}
export interface PolyfillAnimationEffect {
    getTiming(): EffectTiming;
    getComputedTiming(): PolyfillComputedTiming;
    updateTiming(timing?: OptionalEffectTiming): void;
}
export interface PolyfillAnimation extends EventTarget {
    id: string;
    effect: PolyfillAnimationEffect | null;
    timeline: PolyfillTimeline | null;
    currentTime: PolyfillNumberish | null;
    startTime: PolyfillNumberish | null;
    playbackRate: number;
    readonly playState: AnimationPlayState;
    readonly replaceState: AnimationReplaceState;
    readonly pending: boolean;
    readonly ready: Promise<Animation | PolyfillAnimation>;
    readonly finished: Promise<Animation | PolyfillAnimation>;
    rangeStart: PolyfillRangeInput;
    rangeEnd: PolyfillRangeInput;
    onfinish: Animation['onfinish'];
    oncancel: Animation['oncancel'];
    onremove: Animation['onremove'];
    cancel(): void;
    finish(): void;
    play(): void;
    pause(): void;
    reverse(): void;
    persist(): void;
    commitStyles(): void;
    updatePlaybackRate(rate: number): void;
}
export {};
