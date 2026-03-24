import { describe, expect, it, jest } from "@jest/globals";

import { EvaluationsService } from "./evaluations.service";

function createService() {
  const evaluationsRepository = {
    findOne: jest.fn(),
  };
  const assessmentsRepository = {
    find: jest.fn(),
  };
  const participantsRepository = {
    find: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const dataSource = {};
  const usersService = {};

  const service = new EvaluationsService(
    evaluationsRepository as any,
    assessmentsRepository as any,
    participantsRepository as any,
    usersRepository as any,
    dataSource as any,
    usersService as any
  );

  return {
    service,
    evaluationsRepository,
    assessmentsRepository,
    participantsRepository,
    usersRepository,
  };
}

describe("EvaluationsService getMyTasks", () => {
  it("returns only boss tasks when task type filter is boss", async () => {
    const { service } = createService();

    jest
      .spyOn(service as any, "getSelfEvaluationTasks")
      .mockResolvedValue([
        {
          id: "self-27-2",
          type: "self",
          assessment_id: 27,
          deadline: new Date("2026-03-25T00:00:00.000Z"),
        },
      ]);
    jest
      .spyOn(service as any, "getLeaderEvaluationTasks")
      .mockResolvedValue([
        {
          id: "leader-27-12",
          type: "leader",
          assessment_id: 27,
          deadline: new Date("2026-03-25T00:00:00.000Z"),
        },
      ]);
    jest
      .spyOn(service as any, "getBossEvaluationTasks")
      .mockResolvedValue([
        {
          id: "boss-27-7",
          type: "boss",
          assessment_id: 27,
          deadline: new Date("2026-03-25T00:00:00.000Z"),
        },
      ]);

    const tasks = await service.getMyTasks(2, 27, "boss");

    expect(tasks).toEqual([
      expect.objectContaining({
        id: "boss-27-7",
        type: "boss",
        assessment_id: 27,
      }),
    ]);
  });

  it("skips participants whose related user record is unavailable", async () => {
    const {
      service,
      evaluationsRepository,
      assessmentsRepository,
      participantsRepository,
      usersRepository,
    } = createService();

    const usersFindOne = usersRepository.findOne as any;
    const assessmentsFind = assessmentsRepository.find as any;
    const participantsFind = participantsRepository.find as any;
    const evaluationsFindOne = evaluationsRepository.findOne as any;

    usersFindOne.mockResolvedValue({
      id: 2,
      roles: [{ code: "boss" }],
    });

    assessmentsFind.mockResolvedValue([
      {
        id: 20,
        title: "2025年08月绩效考核",
        period: "2025-08",
        deadline: "2025-09-20T00:00:00.000Z",
        template_config: {
          scoring_rules: {
            scoring_mode: "two_tier_weighted",
          },
        },
      },
      {
        id: 27,
        title: "2026年02月OKR考核",
        period: "2026-02",
        deadline: "2026-03-25T00:00:00.000Z",
        template_config: {
          scoring_rules: {
            scoring_mode: "two_tier_weighted",
          },
        },
      },
    ]);

    participantsFind
      .mockResolvedValueOnce([
        {
          id: 1001,
          user: {
            id: 7,
            name: "王优秀",
            department: { name: "长颈羚" },
            leader: { name: "郭楠" },
          },
          self_completed: 1,
          leader_completed: 1,
          updated_at: new Date("2025-09-10T10:34:56.000Z"),
        },
        {
          id: 1002,
          user: null,
          self_completed: 1,
          leader_completed: 1,
          updated_at: new Date("2025-09-10T10:35:56.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2001,
          user: {
            id: 12,
            name: "郭楠",
            department: { name: "长颈羚" },
            leader: { name: "萌总" },
          },
          self_completed: 1,
          leader_completed: 1,
          updated_at: new Date("2026-03-24T12:22:36.000Z"),
        },
      ]);

    evaluationsFindOne.mockResolvedValue(null);

    const tasks = await (service as any).getBossEvaluationTasks(2);

    expect(tasks).toEqual([
      expect.objectContaining({
        id: "boss-20-7",
        assessment_id: 20,
        type: "boss",
      }),
      expect.objectContaining({
        id: "boss-27-12",
        assessment_id: 27,
        type: "boss",
      }),
    ]);
  });
});
