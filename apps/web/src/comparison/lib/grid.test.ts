import { describe, expect, it } from "vitest"
import type {
  ProductComparison,
  RequirementEvidence,
  RoundOutcome,
} from "../types"
import {
  alwaysFailingRequirements,
  classifyRowVerdict,
  evidenceState,
  groupByExpectation,
  noProductPassedEitherRound,
  verdictFromRound,
} from "./grid"

function evidence(
  overrides: Partial<RequirementEvidence> = {}
): RequirementEvidence {
  return {
    requirement: "Cancelamento de ruído",
    expected: "ativo",
    confirmed: false,
    foundValue: null,
    source: null,
    message: "",
    ...overrides,
  }
}

function round(overrides: Partial<RoundOutcome> = {}): RoundOutcome {
  return {
    passed: false,
    correctlyClassified: null,
    evidence: [],
    ...overrides,
  }
}

function product(
  overrides: Partial<ProductComparison> = {}
): ProductComparison {
  return {
    productId: "gid://shopify/Product/1",
    handle: "produto-teste",
    title: "Produto Teste",
    descriptionExcerpt: null,
    expectedToPass: null,
    before: round(),
    after: round(),
    ...overrides,
  }
}

describe("verdictFromRound", () => {
  it("is neutral when there is no registered expectation", () => {
    expect(verdictFromRound(round({ correctlyClassified: null }))).toBe(
      "neutral"
    )
  })

  it("is correct when the round matches the expectation", () => {
    expect(verdictFromRound(round({ correctlyClassified: true }))).toBe(
      "correct"
    )
  })

  it("is incorrect when the round misses the expectation", () => {
    expect(verdictFromRound(round({ correctlyClassified: false }))).toBe(
      "incorrect"
    )
  })
})

describe("classifyRowVerdict", () => {
  it("marks a control rejected in both rounds as a correct classification, not a failure", () => {
    const control = product({
      expectedToPass: false,
      before: round({ passed: false, correctlyClassified: true }),
      after: round({ passed: false, correctlyClassified: true }),
    })

    expect(classifyRowVerdict(control)).toBe("stayedCorrect")
  })

  it("marks a legitimate candidate that fails before and passes after as corrected", () => {
    const candidate = product({
      expectedToPass: true,
      before: round({ passed: false, correctlyClassified: false }),
      after: round({ passed: true, correctlyClassified: true }),
    })

    expect(classifyRowVerdict(candidate)).toBe("corrected")
  })

  it("marks a product that passes before and is wrongly rejected after as regressed", () => {
    const regressed = product({
      expectedToPass: true,
      before: round({ passed: true, correctlyClassified: true }),
      after: round({ passed: false, correctlyClassified: false }),
    })

    expect(classifyRowVerdict(regressed)).toBe("regressed")
  })

  it("puts a product without a registered expectation out of count", () => {
    const unscored = product({
      expectedToPass: null,
      before: round({ correctlyClassified: null }),
      after: round({ correctlyClassified: null }),
    })

    expect(classifyRowVerdict(unscored)).toBe("outOfCount")
  })
})

describe("evidenceState", () => {
  it("is confirmed when the evidence confirms the requirement", () => {
    expect(
      evidenceState(evidence({ confirmed: true, foundValue: "Ativo" }))
    ).toBe("confirmed")
  })

  it("is notFound when nothing was found for the requirement", () => {
    expect(
      evidenceState(evidence({ confirmed: false, foundValue: null }))
    ).toBe("notFound")
  })

  it("is foundNotConfirmed when a value was found but doesn't confirm the requirement", () => {
    expect(
      evidenceState(
        evidence({ confirmed: false, foundValue: "Isolamento passivo" })
      )
    ).toBe("foundNotConfirmed")
  })
})

describe("groupByExpectation", () => {
  it("groups products into shouldPass, shouldReject, and outOfCount", () => {
    const candidate = product({ productId: "1", expectedToPass: true })
    const control = product({ productId: "2", expectedToPass: false })
    const unscored = product({ productId: "3", expectedToPass: null })

    const groups = groupByExpectation([candidate, control, unscored])

    expect(groups.shouldPass).toEqual([candidate])
    expect(groups.shouldReject).toEqual([control])
    expect(groups.outOfCount).toEqual([unscored])
  })

  it("keeps a product without a registered expectation out of the pass/reject counts", () => {
    const unscored = product({ expectedToPass: null })

    const groups = groupByExpectation([unscored])

    expect(groups.shouldPass).toHaveLength(0)
    expect(groups.shouldReject).toHaveLength(0)
    expect(groups.outOfCount).toEqual([unscored])
  })
})

describe("alwaysFailingRequirements", () => {
  it("flags a requirement that fails for every product in both rounds", () => {
    const products = [
      product({
        productId: "1",
        before: round({ evidence: [evidence({ confirmed: false })] }),
        after: round({ evidence: [evidence({ confirmed: false })] }),
      }),
      product({
        productId: "2",
        before: round({ evidence: [evidence({ confirmed: false })] }),
        after: round({ evidence: [evidence({ confirmed: false })] }),
      }),
    ]

    expect(alwaysFailingRequirements(products)).toEqual([
      "Cancelamento de ruído",
    ])
  })

  it("does not flag a requirement that is confirmed for at least one product in one round", () => {
    const products = [
      product({
        productId: "1",
        before: round({ evidence: [evidence({ confirmed: false })] }),
        after: round({ evidence: [evidence({ confirmed: true })] }),
      }),
      product({
        productId: "2",
        before: round({ evidence: [evidence({ confirmed: false })] }),
        after: round({ evidence: [evidence({ confirmed: false })] }),
      }),
    ]

    expect(alwaysFailingRequirements(products)).toEqual([])
  })

  it("returns an empty list when there are no products", () => {
    expect(alwaysFailingRequirements([])).toEqual([])
  })
})

describe("noProductPassedEitherRound", () => {
  it("is true when no product passed in either round", () => {
    const products = [
      product({
        before: round({ passed: false }),
        after: round({ passed: false }),
      }),
      product({
        before: round({ passed: false }),
        after: round({ passed: false }),
      }),
    ]

    expect(noProductPassedEitherRound(products)).toBe(true)
  })

  it("is false when at least one product passed in one round", () => {
    const products = [
      product({
        before: round({ passed: false }),
        after: round({ passed: true }),
      }),
      product({
        before: round({ passed: false }),
        after: round({ passed: false }),
      }),
    ]

    expect(noProductPassedEitherRound(products)).toBe(false)
  })

  it("is false when there are no products", () => {
    expect(noProductPassedEitherRound([])).toBe(false)
  })
})
