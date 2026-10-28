import { describe, expect, it } from "vitest";
import {
  analyzeSkillGaps,
  predictOptimalBid,
  evaluateProjectRecommendation,
  rankProjectsWithAI,
} from "./recommendations";
import type { Project, User } from "@/types";

const mockProject: Project = {
  _id: "p-1",
  title: "طراحی رابط کاربری React و Tailwind",
  description: "یک داشبورد مدیریت پروژه مدرن",
  budget: 5_000_000,
  deadline: "2026-12-01T00:00:00.000Z",
  tags: ["React", "Tailwind CSS", "TypeScript", "Docker"],
  status: "OPEN",
  category: { _id: "cat-1", title: "توسعه وب" },
  proposals: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const mockUser: User = {
  _id: "u-1",
  name: "علی رضایی",
  email: "ali@test.com",
  phoneNumber: "09121111111",
  role: "FREELANCER",
  status: 2,
  isActive: true,
  skills: ["React", "TypeScript", "CSS"],
  completedProjects: 8,
  rating: 4.8,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("AI Recommendations Engine", () => {
  describe("analyzeSkillGaps", () => {
    it("identifies matching skills and missing gaps accurately", () => {
      const result = analyzeSkillGaps(mockUser.skills, mockProject.tags);
      expect(result.matching).toContain("React");
      expect(result.matching).toContain("TypeScript");
      expect(result.gaps.some((g) => g.skill === "Docker")).toBe(true);
    });

    it("handles empty skills cleanly without crashing", () => {
      const result = analyzeSkillGaps([], mockProject.tags);
      expect(result.matching.length).toBe(0);
      expect(result.gaps.length).toBe(mockProject.tags.length);
    });
  });

  describe("predictOptimalBid", () => {
    it("suggests a competitive bid within expected corridor", () => {
      const advice = predictOptimalBid(mockProject, mockUser);
      expect(advice.suggestedBid).toBeGreaterThan(advice.minViableBid);
      expect(advice.suggestedBid).toBeLessThanOrEqual(mockProject.budget);
      expect(advice.winProbability).toBeGreaterThan(0);
      expect(advice.winProbability).toBeLessThanOrEqual(1);
      expect(advice.expectedEarnings).toBeGreaterThan(0);
      expect(advice.confidenceScore).toBeGreaterThanOrEqual(60);
    });

    it("adjusts bid dynamically when competition is intense", () => {
      const crowdedProject: Project = {
        ...mockProject,
        proposals: Array.from({ length: 10 }, (_, i) => ({
          _id: `prop-${i}`,
          description: "bid",
          price: 4_000_000,
          duration: 10,
          status: 0,
          user: { _id: `u-${i}`, name: "Bidder" },
          createdAt: "2026-10-01",
          updatedAt: "2026-10-01",
        })),
      };

      const soloAdvice = predictOptimalBid(mockProject, mockUser);
      const crowdedAdvice = predictOptimalBid(crowdedProject, mockUser);

      expect(crowdedAdvice.suggestedBid).toBeLessThanOrEqual(soloAdvice.suggestedBid);
    });
  });

  describe("evaluateProjectRecommendation", () => {
    it("generates a rich recommendation profile with strengths and risks", () => {
      const rec = evaluateProjectRecommendation(mockProject, mockUser);
      expect(rec.recommendationScore).toBeGreaterThan(50);
      expect(rec.explanation.summary).toBeTruthy();
      expect(rec.explanation.strengths.length).toBeGreaterThan(0);
      expect(rec.tier).toBeDefined();
    });
  });

  describe("rankProjectsWithAI", () => {
    it("ranks projects by recommendation score in descending order", () => {
      const lowMatchProject: Project = {
        ...mockProject,
        _id: "p-2",
        tags: ["Flutter", "Dart", "Swift"],
      };

      const ranked = rankProjectsWithAI([lowMatchProject, mockProject], mockUser);
      expect(ranked[0].project._id).toBe("p-1");
      expect(ranked[0].recommendationScore).toBeGreaterThan(ranked[1].recommendationScore);
    });
  });
});
