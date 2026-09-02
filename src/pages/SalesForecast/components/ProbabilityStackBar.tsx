export type ProbabilitySegment = {
  name: string;
  percent: number;
  color: string;
  isMain: boolean;
};

type ProbabilityStackBarProps = {
  data: ProbabilitySegment[];
};

/** 新盘预测结果概率展示：仅负责按外部百分比渲染，不计算或归一化数据。 */
export function ProbabilityStackBar({ data }: ProbabilityStackBarProps) {
  return (
    <div className="probability-stack-bar" aria-label="去化概率">
      <div className="probability-stack-details">
        {data.map((item, index) => (
          <div className="probability-stack-detail" key={item.name}>
            <span className="probability-stack-dot" style={{ backgroundColor: item.color }} />
            <span className="probability-stack-name">{item.name}</span>
            <strong className="probability-stack-percent">概率 {item.percent}%</strong>
            {item.isMain && (
              <em style={{ backgroundColor: item.color }}>模型判定</em>
            )}
            {index < data.length - 1 && <i className="probability-stack-divider" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProbabilityStackBar;
