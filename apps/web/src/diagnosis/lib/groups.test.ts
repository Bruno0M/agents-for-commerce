import { describe, expect, it } from "vitest"
import type { DiscardedProduct } from "../types"
import { discardGroup } from "./groups"

function discardedProduct(
  overrides: Partial<DiscardedProduct> = {}
): DiscardedProduct {
  return {
    productId: "1",
    handle: "produto",
    title: "Produto",
    reasons: [],
    onlyIllegibilityReasons: false,
    ...overrides,
  }
}

describe("discardGroup", () => {
  it("is illegibilityOnly when every reason is illegibility", () => {
    const product = discardedProduct({
      reasons: [{ message: "a", kind: "illegibility" }],
    })
    expect(discardGroup(product)).toBe("illegibilityOnly")
  })

  it("is legitimateOnly when every reason is a legitimate rejection", () => {
    const product = discardedProduct({
      reasons: [{ message: "a", kind: "legitimateRejection" }],
    })
    expect(discardGroup(product)).toBe("legitimateOnly")
  })

  it("is mixed when reasons include both natures", () => {
    const product = discardedProduct({
      reasons: [
        { message: "a", kind: "illegibility" },
        { message: "b", kind: "legitimateRejection" },
      ],
    })
    expect(discardGroup(product)).toBe("mixed")
  })
})
