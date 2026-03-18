import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminPage.module.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const API_ENDPOINTS = {
  resetSemester: "/api/admin/schedules/init",
  setupAcademicCalendar: "/api/admin/setup-weeks",
  updateDefaultScheduleManager: "/api/admin/schedules/manager",

  getAllAdmins: "/api/users",
  getAdminDetail: (id) => `/api/users/${id}`,
  updateAdminInfo: (id) => `/api/users/${id}`,
  getAdminLogs: (id) => `/api/users/${id}/logs`,

  createAdmin: "/api/admin/users",
  deleteAdmin: (id) => `/api/admin/users/${id}`,
};

async function api(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const result = await res.json().catch(() => null);

  if (!res.ok || result?.success === false) {
    throw new Error(result?.message || "API 요청에 실패했습니다.");
  }

  return result;
}

const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

const PERIODS = [1, 2, 3, 4, 5, 6];

const USER_COLOR_POOL = [
  "#DC143C",
  "#ed673a",
  "#f5ab2a",
  "#faf687",
  "#9ACD32",
  "#58b2b5",
  "#20b4dd",
  "#4682B4",
  "#262694",
  "#483D8B",
  "#9370DB",
  "#db388f",
  "#DB7093",
  "#ec9595",
];

const initialSchedule = {
  mon: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  tue: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  wed: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  thu: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  fri: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  sat: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
  sun: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" },
};

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastTextColor(hex) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#ffffff";
}

export default function AdminPage() {
  const [semesterStart, setSemesterStart] = useState("");
  const [semesterEnd, setSemesterEnd] = useState("");
  const [members, setMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [selectedMemberIdForAssign, setSelectedMemberIdForAssign] = useState("");
  const [baseSchedule, setBaseSchedule] = useState(initialSchedule);
  const [selectedLogMemberId, setSelectedLogMemberId] = useState("");
  const [selectedMemberLogs, setSelectedMemberLogs] = useState([]);
  const [selectedNewMemberColor, setSelectedNewMemberColor] = useState("");
  const [colorError, setColorError] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const result = await api(API_ENDPOINTS.getAllAdmins, {
          method: "GET",
        });

        const fetchedMembers = (result?.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color_hex,
          lateCount: item.late_count ?? 0,
        }));

        setMembers(fetchedMembers);

        if (fetchedMembers.length > 0) {
          setSelectedLogMemberId((prev) => prev || fetchedMembers[0].id);
          setSelectedMemberIdForAssign((prev) => prev || fetchedMembers[0].id);
        }
      } catch (err) {
        console.error(err);
        alert(err.message || "학회원 목록을 불러오지 못했습니다.");
      }
    };

    fetchMembers();
  }, []);

  const usedColors = useMemo(() => {
    return new Set(members.map((member) => member.color).filter(Boolean));
  }, [members]);

  const semesterReady = useMemo(() => {
    const hasDate = Boolean(semesterStart && semesterEnd);
    const hasSchedule = DAYS.some((day) =>
      PERIODS.some((period) => baseSchedule[day.key][period])
    );
    return hasDate && hasSchedule;
  }, [semesterStart, semesterEnd, baseSchedule]);

  const selectedLogMember = useMemo(() => {
    return members.find((member) => member.id === selectedLogMemberId) ?? null;
  }, [members, selectedLogMemberId]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedLogMemberId) {
        setSelectedMemberLogs([]);
        return;
      }

      try {
        const result = await api(API_ENDPOINTS.getAdminLogs(selectedLogMemberId), {
          method: "GET",
        });

        const mappedLogs = (result?.data ?? []).map((item) => {
          const slot = item?.Weekly_Schedules?.Timetable_Slots;
          const checkInDate = item?.check_in_at ? new Date(item.check_in_at) : null;

          return {
            id: item.id,
            date: checkInDate
              ? checkInDate.toLocaleDateString("ko-KR")
              : "-",
            weekNumber: item?.Weekly_Schedules?.week_number ?? "-",
            dayLabel: slot?.day_of_week ?? "-",
            period: slot?.period_number ?? "-",
            scheduledStart: "-",
            scheduledEnd: "-",
            checkInAt: checkInDate
              ? checkInDate.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            checkOutAt: item?.check_out_at
              ? new Date(item.check_out_at).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
          };
        });

        setSelectedMemberLogs(mappedLogs);
      } catch (err) {
        console.error(err);
        alert(err.message || "출결 로그를 불러오지 못했습니다.");
        setSelectedMemberLogs([]);
      }
    };

    fetchLogs();
  }, [selectedLogMemberId]);

  const availableColors = useMemo(() => {
    return USER_COLOR_POOL.filter((color) => !usedColors.has(color));
  }, [usedColors]);

  const handleAddMember = async (e) => {
    e.preventDefault();

    const name = newMemberName.trim();
    if (!name) {
      alert("추가할 학회원 이름을 입력해 주세요.");
      return;
    }

    if (!selectedNewMemberColor) {
      setColorError(true);
      return;
    }

    const duplicated = members.some((member) => member.name === name);
    if (duplicated) {
      alert("같은 이름의 학회원이 이미 있습니다.");
      return;
    }

    try {
      const result = await api(API_ENDPOINTS.createAdmin, {
        method: "POST",
        body: JSON.stringify({
          name,
          color_hex: selectedNewMemberColor,
        }),
      });

      const created = result?.data;
      if (!created) {
        throw new Error("학회원 생성 응답이 올바르지 않습니다.");
      }

      const newMember = {
        id: created.id,
        name: created.name,
        color: created.color_hex,
        lateCount: created.late_count ?? 0,
      };

      setMembers((prev) => [...prev, newMember]);
      setNewMemberName("");
      setSelectedNewMemberColor("");
      setColorError(false);

      if (!selectedMemberIdForAssign) {
        setSelectedMemberIdForAssign(newMember.id);
      }
      if (!selectedLogMemberId) {
        setSelectedLogMemberId(newMember.id);
      }

      alert(result?.message || "학회원이 등록되었습니다.");
    } catch (err) {
      console.error(err);
      alert(err.message || "학회원 추가에 실패했습니다.");
    }
  };

  const handleRemoveMember = async (id) => {
    const target = members.find((member) => member.id === id);
    if (!target) return;

    const ok = confirm(`'${target.name}' 학회원을 삭제할까요?`);
    if (!ok) return;

    try {
      const result = await api(API_ENDPOINTS.deleteAdmin(id), {
        method: "DELETE",
      });

      const remainingMembers = members.filter((member) => member.id !== id);

      setMembers(remainingMembers);

      setBaseSchedule((prev) => {
        const next = structuredClone(prev);

        DAYS.forEach((day) => {
          PERIODS.forEach((period) => {
            if (next[day.key][period] === id) {
              next[day.key][period] = "";
            }
          });
        });

        return next;
      });

      if (selectedMemberIdForAssign === id) {
        setSelectedMemberIdForAssign(remainingMembers[0]?.id ?? "");
      }

      if (selectedLogMemberId === id) {
        setSelectedLogMemberId(remainingMembers[0]?.id ?? "");
      }

      alert(result?.message || "학회원 정보가 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      alert(err.message || "학회원 삭제에 실패했습니다.");
    }
  };

  const handleCellClick = (dayKey, period) => {
    if (!selectedMemberIdForAssign) {
      alert("먼저 아래 학회원 색상표에서 배정할 학회원을 선택해 주세요.");
      return;
    }

    setBaseSchedule((prev) => {
      const currentAssigned = prev[dayKey][period];
      const next = structuredClone(prev);
      next[dayKey][period] = currentAssigned === selectedMemberIdForAssign ? "" : selectedMemberIdForAssign;
      return next;
    });
  };

  const clearScheduleCell = (dayKey, period) => {
    setBaseSchedule((prev) => {
      const next = structuredClone(prev);
      next[dayKey][period] = "";
      return next;
    });
  };

  const getSlotId = (dayIndex, period) => dayIndex * 6 + period;

  const buildDefaultSchedulePayload = () => {
    const schedules = [];

    DAYS.forEach((day, dayIndex) => {
      PERIODS.forEach((period) => {
        const assignedAdminId = baseSchedule?.[day.key]?.[period] || null;

        schedules.push({
          id: getSlotId(dayIndex, period),
          default_admin_id: assignedAdminId,
        });
      });
    });

    return schedules;
  };

  const handleSemesterSubmit = async (e) => {
    e.preventDefault();

    if (!semesterStart || !semesterEnd) {
      alert("개강일과 종강일을 모두 입력해 주세요.");
      return;
    }

    const hasAnySchedule = DAYS.some((day) =>
      PERIODS.some((period) => baseSchedule[day.key][period])
    );

    if (!hasAnySchedule) {
      alert("기본 시간표에서 최소 1칸 이상 배정해 주세요.");
      return;
    }

    const schedules = buildDefaultSchedulePayload();

    try {
      await api(API_ENDPOINTS.resetSemester, {
        method: "POST",
      });

      await api(API_ENDPOINTS.updateDefaultScheduleManager, {
        method: "PATCH",
        body: JSON.stringify({
          schedules,
        }),
      });

      const result = await api(API_ENDPOINTS.setupAcademicCalendar, {
        method: "POST",
        body: JSON.stringify({
          startDate: semesterStart,
          endDate: semesterEnd,
        }),
      });

      alert(result?.message || "새 학기 설정이 완료되었습니다.");
    } catch (err) {
      console.error(err);
      alert(err.message || "새 학기 설정에 실패했습니다.");
    }
  };

  const selectedAssignMember = members.find(
    (member) => member.id === selectedMemberIdForAssign
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.title}>관리자 페이지</div>
          <div className={styles.sub}>
            새학기 설정 · 학회원 관리 · 출결 로그 조회
          </div>
        </div>

        <Link className={styles.linkBtn} to="/">
          홈으로
        </Link>
      </div>

      <div className={styles.layout}>
        {/* SECTION 1 */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>SECTION 1</div>
              <h2 className={styles.sectionTitle}>새학기 시작할 때</h2>
              <p className={styles.sectionDesc}>
                개강일/종강일 입력 후, 월~일 1~6교시 기본 시간표를 표에서 바로 배정한다.
              </p>
            </div>

            <div
              className={`${styles.statusBadge} ${
                semesterReady ? styles.statusReady : styles.statusPending
              }`}
            >
              {semesterReady ? "입력 준비 완료" : "입력 필요"}
            </div>
          </div>

          <form className={styles.stack} onSubmit={handleSemesterSubmit}>
            <div className={styles.subCard}>
              <h3 className={styles.subCardTitle}>1) 학기 기간 입력</h3>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>개강일</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={semesterStart}
                    onChange={(e) => setSemesterStart(e.target.value)}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>종강일</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={semesterEnd}
                    onChange={(e) => setSemesterEnd(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.subCard}>
              <div className={styles.subCardTop}>
                <div>
                  <h3 className={styles.subCardTitle}>2) 기본 시간표 입력</h3>
                  <p className={styles.helperText}>
                    아래 색상 배정된 학회원을 선택한 뒤 시간표 칸을 눌러 배정한다.
                    이미 배정된 칸에서 같은 학회원을 다시 누르면 해제된다.
                  </p>
                </div>
              </div>

              <div className={styles.assignPanel}>
                <div className={styles.assignTitle}>배정할 학회원 선택</div>

                <div className={styles.memberBadgeWrap}>
                  {members.map((member) => {
                    const active = selectedMemberIdForAssign === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`${styles.memberBadgeBtn} ${
                          active ? styles.memberBadgeBtnActive : ""
                        }`}
                        onClick={() => setSelectedMemberIdForAssign(member.id)}
                        style={{
                          background: hexToRgba(member.color, active ? 0.22 : 0.12),
                          borderColor: member.color,
                          color: getContrastTextColor(member.color) === "#ffffff"
                            ? "#111827"
                            : "#111827",
                        }}
                      >
                        <span
                          className={styles.memberBadgeDot}
                          style={{ background: member.color }}
                        />
                        {member.name}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.currentAssignInfo}>
                  현재 선택:
                  <strong>
                    {selectedAssignMember
                      ? ` ${selectedAssignMember.name}`
                      : " 없음"}
                  </strong>
                </div>
              </div>

              <div className={styles.scheduleTableWrap}>
                <table className={styles.scheduleMatrix}>
                  <thead>
                    <tr>
                      <th className={styles.cornerCell}>교시</th>
                      {DAYS.map((day) => (
                        <th key={day.key}>{day.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => (
                      <tr key={period}>
                        <th className={styles.periodHeader}>{period}교시</th>

                        {DAYS.map((day) => {
                          const memberId = baseSchedule[day.key][period];
                          const member = members.find((m) => m.id === memberId);

                          return (
                            <td key={`${day.key}-${period}`}>
                              <button
                                type="button"
                                className={`${styles.scheduleCell} ${
                                  member ? styles.scheduleCellFilled : styles.scheduleCellEmpty
                                }`}
                                onClick={() => handleCellClick(day.key, period)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  clearScheduleCell(day.key, period);
                                }}
                                style={
                                  member
                                    ? {
                                        background: hexToRgba(member.color, 0.16),
                                        borderColor: member.color,
                                        color: "#111827",
                                      }
                                    : undefined
                                }
                                title={
                                  member
                                    ? `${day.label} ${period}교시 - ${member.name}`
                                    : `${day.label} ${period}교시 - 비어 있음`
                                }
                              >
                                {member ? (
                                  <>
                                    <span
                                      className={styles.cellColorBar}
                                      style={{ background: member.color }}
                                    />
                                    <span className={styles.cellName}>{member.name}</span>
                                  </>
                                ) : (
                                  <span className={styles.cellPlaceholder}>비어 있음</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.helperFoot}>
                좌클릭으로 배정/해제, 우클릭으로 바로 비우기
              </div>
            </div>

            <div className={styles.submitRow}>
              <button type="submit" className={styles.primaryBtn}>
                새학기 설정 저장 준비
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2 */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>SECTION 2</div>
              <h2 className={styles.sectionTitle}>학회원</h2>
              <p className={styles.sectionDesc}>
                목록 확인, 추가, 삭제를 여기서 처리한다.
              </p>
            </div>

            <div className={styles.countBadge}>총 {members.length}명</div>
          </div>

          <div className={styles.memberGrid}>
            <div className={styles.subCard}>
              <div className={styles.subCardTop}>
                <div>
                  <h3 className={styles.subCardTitle}>1) 학회원 목록</h3>
                </div>
              </div>

              <div className={styles.memberList}>
                {members.length === 0 ? (
                  <div className={styles.emptyBox}>등록된 학회원이 없습니다.</div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberNameRow}>
                          <span
                            className={styles.memberColorChip}
                            style={{ background: member.color }}
                          />
                          <div className={styles.memberName}>{member.name}</div>
                        </div>
                        <div className={styles.memberMeta}>
                          id: {member.id} · color: {member.color}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.smallDangerBtn}
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.sideStack}>
              <div className={styles.subCard}>
                <h3 className={styles.subCardTitle}>2) 학회원 추가</h3>

                <form className={styles.stack} onSubmit={handleAddMember}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>이름</span>
                    <input
                      className={styles.input}
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="학회원 이름"
                    />
                  </label>

                  <div className={styles.colorChartBox}>
                    <div className={styles.colorChartTitle}>색상 차트</div>

                    <div className={styles.colorChartGrid}>
                      {availableColors.length === 0 ? (
                        <div className={styles.emptyColorText}>선택 가능한 색상이 없습니다.</div>
                      ) : (
                        availableColors.map((color) => {
                          const isSelected = selectedNewMemberColor === color;

                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setSelectedNewMemberColor(color);
                                setColorError(false);
                              }}
                              className={`${styles.colorSwatch} ${
                                isSelected ? styles.colorSwatchSelected : ""
                              }`}
                              title={`${color} 선택`}
                            >
                              <span
                                className={styles.colorPreview}
                                style={{ background: color }}
                              />
                              <span className={styles.colorCode}>{color}</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {colorError && (
                      <div className={styles.fieldError}>색상을 선택해 주세요.</div>
                    )}
                  </div>
                  <div className={styles.nextColorPreview}>
                    선택한 색상:
                    <strong>{selectedNewMemberColor ? ` ${selectedNewMemberColor}` : " 없음"}</strong>
                  </div>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={!newMemberName.trim() || !selectedNewMemberColor}
                  >
                    학회원 추가
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>SECTION 3</div>
              <h2 className={styles.sectionTitle}>로그</h2>
              <p className={styles.sectionDesc}>
                학회원 이름 뱃지를 누르면 해당 학회원의 출결 로그 전체가 나온다.
              </p>
            </div>
          </div>

          <div className={styles.subCard}>
            <h3 className={styles.subCardTitle}>학회원 선택</h3>

            <div className={styles.memberBadgeWrap}>
              {members.map((member) => {
                const active = selectedLogMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`${styles.memberBadgeBtn} ${
                      active ? styles.memberBadgeBtnActive : ""
                    }`}
                    onClick={() => setSelectedLogMemberId(member.id)}
                    style={{
                      background: hexToRgba(member.color, active ? 0.22 : 0.1),
                      borderColor: member.color,
                    }}
                  >
                    <span
                      className={styles.memberBadgeDot}
                      style={{ background: member.color }}
                    />
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.subCard}>
            <div className={styles.subCardTop}>
              <div>
                <h3 className={styles.subCardTitle}>출결 로그 목록</h3>
                <p className={styles.helperText}>
                  관리시작/관리끝 예정 시각과 실제 관리시작/관리끝 기록을 함께 보여준다.
                </p>
              </div>
            </div>

            {!selectedLogMember ? (
              <div className={styles.emptyBox}>학회원을 선택해 주세요.</div>
            ) : selectedMemberLogs.length === 0 ? (
              <div className={styles.emptyBox}>
                {selectedLogMember.name}의 로그가 없습니다.
              </div>
            ) : (
              <div className={styles.logList}>
                {selectedMemberLogs.map((log) => (
                  <div key={log.id} className={styles.logItem}>
                    <div className={styles.logTop}>
                      <div className={styles.logLeft}>
                        <span
                          className={styles.logMemberDot}
                          style={{ background: selectedLogMember.color }}
                        />
                        <span className={styles.logName}>{selectedLogMember.name}</span>
                      </div>

                      <span className={styles.logDate}>
                        {log.date} · {log.dayLabel} · {log.period}교시
                      </span>
                    </div>

                    <div className={styles.logInfoGrid}>
                      <div className={styles.logInfoBox}>
                        <div className={styles.logInfoLabel}>관리시작</div>
                        <div className={styles.logInfoValue}>{log.scheduledStart}</div>
                      </div>

                      <div className={styles.logInfoBox}>
                        <div className={styles.logInfoLabel}>관리끝</div>
                        <div className={styles.logInfoValue}>{log.scheduledEnd}</div>
                      </div>

                      <div className={styles.logInfoBox}>
                        <div className={styles.logInfoLabel}>실제 시작</div>
                        <div className={styles.logInfoValue}>{log.checkInAt}</div>
                      </div>

                      <div className={styles.logInfoBox}>
                        <div className={styles.logInfoLabel}>실제 종료</div>
                        <div className={styles.logInfoValue}>{log.checkOutAt}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}