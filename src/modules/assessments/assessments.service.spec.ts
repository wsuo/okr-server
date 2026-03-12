import { describe, expect, it, jest } from "@jest/globals";

import { AssessmentsService } from "./assessments.service";

function createService() {
  const assessmentsRepository: {
    findOne: jest.Mock;
  } = {
    findOne: jest.fn(),
  };
  const participantsRepository = {};
  const usersRepository = {};
  const templatesRepository = {};
  const okrsRepository = {};
  const evaluationsRepository = {};
  const dataSource = {};
  const scoreCalculationService = {};
  const mailService: {
    sendBulkAssessmentReminders: jest.Mock;
  } = {
    sendBulkAssessmentReminders: jest.fn(),
  };

  const service = new AssessmentsService(
    assessmentsRepository as any,
    participantsRepository as any,
    usersRepository as any,
    templatesRepository as any,
    okrsRepository as any,
    evaluationsRepository as any,
    dataSource as any,
    scoreCalculationService as any,
    mailService as any
  );

  return {
    service,
    assessmentsRepository,
    mailService,
  };
}

describe("AssessmentsService reminder workflow", () => {
  it("groups reminder emails by actual recipient and skips completed participants", async () => {
    const { service, assessmentsRepository, mailService } = createService();

    (assessmentsRepository.findOne as any).mockResolvedValue({
      id: 35,
      title: "2026年02月OKR考核",
      period: "2026-02",
      deadline: new Date("2026-03-25T00:00:00.000Z"),
      participants: [
        {
          deleted_at: null,
          self_completed: 0,
          leader_completed: 0,
          user: {
            id: 7,
            name: "张轩",
            email: "zhangxuan@example.com",
            leader: {
              id: 101,
              name: "郭楠",
              email: "guonan@example.com",
            },
          },
        },
        {
          deleted_at: null,
          self_completed: 1,
          leader_completed: 0,
          user: {
            id: 8,
            name: "陈欣然",
            email: "chen@example.com",
            leader: {
              id: 101,
              name: "郭楠",
              email: "guonan@example.com",
            },
          },
        },
        {
          deleted_at: null,
          self_completed: 1,
          leader_completed: 1,
          user: {
            id: 9,
            name: "王优秀",
            email: "wyx@example.com",
            leader: {
              id: 102,
              name: "王培瀚",
              email: "wangpeihan@example.com",
            },
          },
        },
      ],
    });

    const result = await service.sendReminderEmails(35, [7, 8, 9]);

    expect(mailService.sendBulkAssessmentReminders).toHaveBeenCalledWith(
      [
        {
          email: "zhangxuan@example.com",
          name: "张轩",
          pendingItems: [
            {
              participantName: "张轩",
              waitingFor: "员工自评",
            },
          ],
        },
        {
          email: "guonan@example.com",
          name: "郭楠",
          pendingItems: [
            {
              participantName: "陈欣然",
              waitingFor: "领导评分",
            },
          ],
        },
      ],
      {
        assessmentTitle: "2026年02月OKR考核",
        period: "2026-02",
        endDate: new Date("2026-03-25T00:00:00.000Z"),
        systemUrl: "http://okr.gerenukagro.com/",
      }
    );

    expect(result).toEqual({
      assessment_id: 35,
      assessment_title: "2026年02月OKR考核",
      sent: [
        {
          recipient_name: "张轩",
          recipient_email: "zhangxuan@example.com",
          pending_items: ["张轩（员工自评）"],
        },
        {
          recipient_name: "郭楠",
          recipient_email: "guonan@example.com",
          pending_items: ["陈欣然（领导评分）"],
        },
      ],
      failed: [],
      skipped: [
        {
          participant_id: 9,
          participant_name: "王优秀",
          reason: "该参与人已完成当前提交，无需提醒",
        },
      ],
    });
  });

  it("marks reminder as failed when recipient email is missing", async () => {
    const { service, assessmentsRepository, mailService } = createService();

    (assessmentsRepository.findOne as any).mockResolvedValue({
      id: 35,
      title: "2026年02月OKR考核",
      period: "2026-02",
      deadline: new Date("2026-03-25T00:00:00.000Z"),
      participants: [
        {
          deleted_at: null,
          self_completed: 1,
          leader_completed: 0,
          user: {
            id: 8,
            name: "陈欣然",
            email: "chen@example.com",
            leader: {
              id: 101,
              name: "郭楠",
              email: "",
            },
          },
        },
      ],
    });

    const result = await service.sendReminderEmails(35, [8]);

    expect(mailService.sendBulkAssessmentReminders).not.toHaveBeenCalled();
    expect(result.failed).toEqual([
      {
        participant_id: 8,
        participant_name: "陈欣然",
        reason: "提醒对象未配置邮箱",
      },
    ]);
  });

  it("passes custom reminder subject html and context to mail service", async () => {
    const { service, assessmentsRepository, mailService } = createService();

    (assessmentsRepository.findOne as any).mockResolvedValue({
      id: 35,
      title: "2026年02月OKR考核",
      period: "2026-02",
      deadline: new Date("2026-03-25T00:00:00.000Z"),
      participants: [
        {
          deleted_at: null,
          self_completed: 0,
          leader_completed: 0,
          user: {
            id: 7,
            name: "张轩",
            email: "zhangxuan@example.com",
            leader: null,
          },
        },
      ],
    });

    await service.sendReminderEmails(
      35,
      [7],
      1,
      {
        subject: "[自定义] OKR 提醒",
        html: "<p>{{recipientName}} - {{customNote}}</p>",
        context: {
          customNote: "请尽快处理",
        },
      }
    );

    expect(mailService.sendBulkAssessmentReminders).toHaveBeenCalledWith(
      [
        {
          email: "zhangxuan@example.com",
          name: "张轩",
          pendingItems: [
            {
              participantName: "张轩",
              waitingFor: "员工自评",
            },
          ],
        },
      ],
      {
        assessmentTitle: "2026年02月OKR考核",
        period: "2026-02",
        endDate: new Date("2026-03-25T00:00:00.000Z"),
        systemUrl: "http://okr.gerenukagro.com/",
      },
      {
        subject: "[自定义] OKR 提醒",
        html: "<p>{{recipientName}} - {{customNote}}</p>",
        context: {
          customNote: "请尽快处理",
        },
      }
    );
  });
});
