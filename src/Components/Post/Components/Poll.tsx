import { useState, useRef } from "react";
import { useWebSocket } from "@/System/Context/WebSocket";
import { useAuth } from "@/System/Hooks/useAuth";
import { useModalsStore } from "@/Store/modalsStore";
import { CheckIcon } from "../../../System/UI/IconPack";
import { Avatar } from "@/UIKit";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import styles from "./Poll.module.scss";

const getDeclension = (n: number, forms: [string, string, string]) => {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 === 1) return forms[0];
  if (n1 >= 2 && n1 <= 4) return forms[1];
  return forms[2];
};

interface PollOption {
  id: number;
  text: string;
  votes_count: number;
}

interface PollData {
  id: number;
  question: string;
  is_anonymous: boolean;
  multiple_choice: boolean;
  expires_at?: string | null;
  total_votes: number;
  user_vote: number[];
  options: PollOption[];
}

interface PollVoter {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

interface OptionVoters {
  users: PollVoter[];
  loading: boolean;
  hasMore: boolean;
  offset: number;
}

const VOTERS_LIMIT = 20;

const Poll = ({ poll, postId }: { poll: PollData; postId: number }) => {
  const { wsClient } = useWebSocket();
  const { accountData } = useAuth();
  const { openModal } = useModalsStore() as any;
  const navigate = useNavigate();
  const [data, setData] = useState<PollData>(poll);
  const loadingRef = useRef(false);

  const [resultsOpen, setResultsOpen] = useState(false);
  const [votersData, setVotersData] = useState<Record<number, OptionVoters>>(
    {},
  );

  const hasVoted = data.user_vote.length > 0;
  const showResults = hasVoted || !accountData;
  const isExpired = data.expires_at
    ? new Date(data.expires_at) < new Date()
    : false;
  const canSeeVoters = showResults && !data.is_anonymous;

  const loadVoters = (optionId: number, offset: number) => {
    setVotersData((prev) => ({
      ...prev,
      [optionId]: {
        users: offset === 0 ? [] : prev[optionId]?.users || [],
        loading: true,
        hasMore: prev[optionId]?.hasMore ?? false,
        offset,
      },
    }));

    wsClient
      .send({
        type: "social",
        action: "polls/voters",
        payload: {
          post_id: postId,
          option_id: optionId,
          limit: VOTERS_LIMIT,
          offset,
        },
      })
      .then((res: any) => {
        if (res.status === "success") {
          const newUsers: PollVoter[] = res.users || [];
          setVotersData((prev) => ({
            ...prev,
            [optionId]: {
              users:
                offset === 0
                  ? newUsers
                  : [...(prev[optionId]?.users || []), ...newUsers],
              loading: false,
              hasMore: res.hasMore ?? false,
              offset: offset + newUsers.length,
            },
          }));
        } else {
          setVotersData((prev) => ({
            ...prev,
            [optionId]: { ...prev[optionId], loading: false },
          }));
        }
      })
      .catch(() => {
        setVotersData((prev) => ({
          ...prev,
          [optionId]: { ...prev[optionId], loading: false },
        }));
      });
  };

  const openResults = () => {
    setResultsOpen(true);
    data.options.forEach((opt) => {
      if (opt.votes_count > 0 && !votersData[opt.id]) {
        loadVoters(opt.id, 0);
      }
    });
  };

  const toggleResults = () => {
    if (resultsOpen) {
      setResultsOpen(false);
    } else {
      openResults();
    }
  };

  const handleVote = (optionId: number) => {
    if (!accountData || loadingRef.current || isExpired) return;

    let newOptionIds: number[];

    if (data.multiple_choice) {
      if (data.user_vote.includes(optionId)) {
        newOptionIds = data.user_vote.filter((id) => id !== optionId);
      } else {
        newOptionIds = [...data.user_vote, optionId];
      }
    } else {
      const isSame =
        data.user_vote.length === 1 && data.user_vote[0] === optionId;
      newOptionIds = isSame ? [] : [optionId];
    }

    loadingRef.current = true;
    const prevData = data;

    wsClient
      .send({
        type: "social",
        action: "posts/vote",
        payload: {
          post_id: postId,
          option_ids: newOptionIds.length ? newOptionIds : [optionId],
        },
      })
      .then((res: any) => {
        loadingRef.current = false;
        if (res.status === "success") {
          setData((prev) => ({
            ...prev,
            total_votes: res.poll.total_votes,
            user_vote: res.poll.user_vote,
            options: res.poll.options,
          }));
          if (res.poll.user_vote.length === 0) {
            setResultsOpen(false);
          } else if (resultsOpen) {
            res.poll.options.forEach((opt: PollOption) => {
              if (opt.votes_count > 0) {
                loadVoters(opt.id, 0);
              } else {
                setVotersData((prev) => ({
                  ...prev,
                  [opt.id]: {
                    users: [],
                    loading: false,
                    hasMore: false,
                    offset: 0,
                  },
                }));
              }
            });
          }
        } else {
          setData(prevData);
          openModal({
            type: "alert",
            props: { title: "Ошибка", message: res.message },
          });
        }
      })
      .catch(() => {
        loadingRef.current = false;
        setData(prevData);
      });
  };

  return (
    <>
      <div data-no-double-tap>
        {data.question && (
          <div className={styles.PollQuestion}>{data.question}</div>
        )}

        <div className={styles.PollOptions}>
          {data.options.map((option) => {
            const isSelected = data.user_vote.includes(option.id);
            const percent =
              data.total_votes > 0
                ? Math.round((option.votes_count / data.total_votes) * 100)
                : 0;

            return (
              <button
                key={option.id}
                className={clsx(styles.PollOption, {
                  [styles.selected]: isSelected,
                  [styles.results]: showResults,
                  [styles.multiple]: data.multiple_choice,
                })}
                onClick={() => handleVote(option.id)}
                disabled={!accountData || isExpired}
              >
                {showResults && (
                  <div
                    className={styles.PollOption__bar}
                    style={{ width: `${percent}%` }}
                  />
                )}
                <div className={styles.PollOption__dot}>
                  <CheckIcon />
                </div>
                <span className={styles.PollOption__text}>{option.text}</span>
                {showResults && (
                  <span className={styles.PollOption__percent}>{percent}%</span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.PollFooter}>
          <span className={styles.PollVotes}>
            {data.total_votes}{" "}
            {getDeclension(data.total_votes, ["голос", "голоса", "голосов"])}
          </span>
          {data.is_anonymous && (
            <span className={styles.PollAnonymous}>· Анонимный</span>
          )}
          {data.multiple_choice && (
            <span className={styles.PollMultiple}>· Несколько ответов</span>
          )}
          {isExpired && <span className={styles.PollExpired}>· Завершён</span>}
          {canSeeVoters && (
            <button
              className={clsx(styles.PollResultsBtn, {
                [styles.open]: resultsOpen,
              })}
              onClick={toggleResults}
            >
              Результаты
            </button>
          )}
        </div>

        {/* ——— Панель результатов ——— */}
        <AnimatePresence initial={false}>
          {resultsOpen && (
            <motion.div
              key="poll-results"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.PollResultsInner}>
                {data.options.map((option) => {
                  const optionVoters = votersData[option.id];
                  return (
                    <div key={option.id} className={styles.PollResultsSection}>
                      <div className={styles.PollResultsSectionHead}>
                        <span className={styles.PollResultsSectionTitle}>
                          {option.text}
                        </span>
                        <span className={styles.PollResultsSectionCount}>
                          {option.votes_count}{" "}
                          {getDeclension(option.votes_count, [
                            "голос",
                            "голоса",
                            "голосов",
                          ])}
                        </span>
                      </div>

                      {optionVoters?.loading && !optionVoters.users.length && (
                        <div className={styles.PollVotersLoading}>
                          <div
                            className="UI-PRELOAD"
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                            }}
                          />
                        </div>
                      )}

                      {!optionVoters?.loading && option.votes_count === 0 && (
                        <div className={styles.PollVotersEmpty}>
                          Никто не выбрал
                        </div>
                      )}

                      {optionVoters?.users.map((voter) => (
                        <button
                          key={voter.id}
                          className={styles.PollVoterItem}
                          onClick={() => navigate(`/e/${voter.username}`)}
                        >
                          <Avatar
                            avatar={voter.avatar}
                            name={voter.name}
                            size={34}
                          />
                          <span className={styles.PollVoterName}>
                            {voter.name}
                          </span>
                        </button>
                      ))}

                      {optionVoters?.hasMore && (
                        <button
                          className={styles.PollVotersMore}
                          onClick={() =>
                            loadVoters(option.id, optionVoters.offset)
                          }
                          disabled={optionVoters.loading}
                        >
                          {optionVoters.loading
                            ? "Загрузка..."
                            : "Показать ещё"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Poll;
