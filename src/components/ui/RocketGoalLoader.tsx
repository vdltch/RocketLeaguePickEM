type RocketGoalLoaderProps = {
  label?: string
}

export const RocketGoalLoader = ({ label = 'Chargement...' }: RocketGoalLoaderProps) => (
  <div className="rl-loader-overlay" role="status" aria-live="polite" aria-label={label}>
    <div className="rl-loader-wrap">
      <div className="rl-loader-scene">
        <div className="rl-loader-goal">
          <div className="rl-loader-net" />
        </div>
        <div className="rl-loader-ball">
          <span className="rl-loader-core" />
        </div>
        <div className="rl-loader-trail" />
      </div>
      <p className="rl-loader-label">{label}</p>
    </div>
  </div>
)
