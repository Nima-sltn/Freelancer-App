import { describe, expect, it } from "vitest";
import {
  sha256,
  canonicalStringify,
  hashRecord,
  MerkleTree,
  verifyHashChain,
} from "./merkle";

describe("sha256 hashing", () => {
  it("produces standard sha256 output for known test vectors", () => {
    // Known SHA-256 test vectors
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(sha256("freelancer-app")).toBe("62d6068a459d9770e3ffb2d6d822f5c7475e587e6c294292057cdeaaf80cb680");
  });

  it("handles Unicode and multi-byte Persian characters accurately", () => {
    const hash = sha256("پروژه فریلنسری تستی");
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe("string");
    // Deterministic repeatability
    expect(sha256("پروژه فریلنسری تستی")).toBe(hash);
  });
});

describe("canonical serialization", () => {
  it("sorts object keys deterministically regardless of insertion order", () => {
    const objA = { z: 1, a: 2, m: { y: 10, x: 20 } };
    const objB = { a: 2, m: { x: 20, y: 10 }, z: 1 };
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
    expect(hashRecord(objA)).toBe(hashRecord(objB));
  });
});

describe("MerkleTree", () => {
  it("handles empty items gracefully", () => {
    const tree = new MerkleTree([]);
    expect(tree.leafCount).toBe(1);
    expect(tree.root).toHaveLength(64);
  });

  it("builds a single-leaf tree", () => {
    const tree = new MerkleTree(["single-record"]);
    expect(tree.leafCount).toBe(1);
    expect(tree.root).toBe(sha256("single-record"));
  });

  it("builds a balanced 4-leaf tree and generates valid inclusion proofs", () => {
    const records = ["tx-1", "tx-2", "tx-3", "tx-4"];
    const tree = new MerkleTree(records);
    expect(tree.leafCount).toBe(4);
    expect(tree.root).toHaveLength(64);

    for (let i = 0; i < records.length; i++) {
      const proof = tree.generateProof(i);
      expect(proof).not.toBeNull();
      if (!proof) return;
      expect(proof.leafIndex).toBe(i);
      expect(proof.rootHash).toBe(tree.root);
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    }
  });

  it("builds an unbalanced 3-leaf tree and generates valid proofs", () => {
    const records = ["proposal-a", "proposal-b", "proposal-c"];
    const tree = new MerkleTree(records);
    expect(tree.leafCount).toBe(3);

    for (let i = 0; i < records.length; i++) {
      const proof = tree.generateProof(i);
      expect(proof).not.toBeNull();
      if (!proof) return;
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    }
  });

  it("rejects tampered proofs", () => {
    const records = ["entry-1", "entry-2", "entry-3", "entry-4"];
    const tree = new MerkleTree(records);
    const proof = tree.generateProof(1);
    expect(proof).not.toBeNull();
    if (!proof) return;

    // Tamper with the leaf hash
    const tamperedProof = {
      ...proof,
      leafHash: sha256("tampered-entry"),
    };
    expect(MerkleTree.verifyProof(tamperedProof)).toBe(false);

    // Tamper with step sibling hash
    const tamperedStepProof = {
      ...proof,
      steps: proof.steps.map((step, idx) =>
        idx === 0 ? { ...step, hash: sha256("fake-sibling") } : step
      ),
    };
    expect(MerkleTree.verifyProof(tamperedStepProof)).toBe(false);
  });

  it("returns null proof for out-of-range index", () => {
    const tree = new MerkleTree(["a", "b"]);
    expect(tree.generateProof(-1)).toBeNull();
    expect(tree.generateProof(5)).toBeNull();
  });
});

describe("verifyHashChain", () => {
  it("verifies empty records with valid genesis root", () => {
    const res = verifyHashChain([]);
    expect(res.isValid).toBe(true);
    expect(res.totalEntries).toBe(0);
    expect(res.rootHash).toBe(sha256("genesis"));
  });

  it("verifies a sequence of journal entries deterministically", () => {
    const entries = [
      { id: "e1", action: "create_project", amount: 1000 },
      { id: "e2", action: "submit_bid", amount: 800 },
      { id: "e3", action: "accept_bid", amount: 800 },
    ];
    const resA = verifyHashChain(entries);
    const resB = verifyHashChain(entries);
    expect(resA.isValid).toBe(true);
    expect(resA.totalEntries).toBe(3);
    expect(resA.rootHash).toBe(resB.rootHash);
  });
});
