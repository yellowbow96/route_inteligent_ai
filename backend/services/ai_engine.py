def generate_ai_insights(score, speed_history, fuel_used):
    """
    Rule-Based AI Recommendation Engine
    """
    print("[DSA] Executing Rule-Based AI Recommendation Engine logic")
    overspeed_events = sum(1 for s in speed_history if s.get('event') == 'overspeed')
    braking_events = sum(1 for s in speed_history if s.get('event') == 'braking')
    
    if score >= 90 and overspeed_events == 0:
        return "Excellent ride! Your throttle control was perfect."
    elif overspeed_events > 3:
        return "You are frequently overspeeding! Please throttle down."
    elif braking_events > 3:
        return "You experienced multiple sudden braking events. Increase your following distance."
    elif fuel_used > 5:
        return "Your fuel efficiency may decrease on long rides. Try considering lower acceleration."
    else:
        return "Good ride. Maintain steady speeds for better efficiency."
