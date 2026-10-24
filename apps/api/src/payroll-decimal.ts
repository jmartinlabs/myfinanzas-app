/** Exact base-ten arithmetic. No binary float or rounded display enters calculations. */
export class Decimal {
  constructor(
    readonly n: bigint,
    readonly scale = 0,
  ) {}
  static parse(v: string) {
    if (!/^-?\d+(?:\.\d+)?$/.test(v) || v.length > 120)
      throw Error("Decimal inválido");
    const [a, b = ""] = v.split(".");
    return new Decimal(BigInt(a + b), b.length);
  }
  add(b: Decimal) {
    const s = Math.max(this.scale, b.scale);
    return new Decimal(
      this.n * 10n ** BigInt(s - this.scale) + b.n * 10n ** BigInt(s - b.scale),
      s,
    );
  }
  neg() {
    return new Decimal(-this.n, this.scale);
  }
  sub(b: Decimal) {
    return this.add(b.neg());
  }
  mul(b: Decimal) {
    return new Decimal(this.n * b.n, this.scale + b.scale);
  }
  pct() {
    return new Decimal(this.n, this.scale + 2);
  }
  cmp(b: Decimal) {
    const n = this.sub(b).n;
    return n < 0n ? -1 : n > 0n ? 1 : 0;
  }
  exact() {
    const sign = this.n < 0n ? "-" : "",
      s = (this.n < 0n ? -this.n : this.n)
        .toString()
        .padStart(this.scale + 1, "0");
    return (
      sign +
      (this.scale ? s.slice(0, -this.scale) + "." + s.slice(-this.scale) : s)
    );
  }
  money() {
    let n = this.n;
    if (this.scale > 2) {
      const d = 10n ** BigInt(this.scale - 2),
        a = n < 0n ? -n : n;
      n = (a / d + ((a % d) * 2n >= d ? 1n : 0n)) * (n < 0n ? -1n : 1n);
    } else n *= 10n ** BigInt(2 - this.scale);
    const a = (n < 0n ? -n : n).toString().padStart(3, "0");
    return (n < 0n ? "-" : "") + a.slice(0, -2) + "." + a.slice(-2);
  }
}
export const D = (v: string) => Decimal.parse(v);
