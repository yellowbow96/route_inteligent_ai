def greedy_fuel_stops(route_distances_km, bike_capacity, bike_efficiency, mode_modifier=1.0):
    """
    Greedy Algorithm Implementation for evaluating the exact points fuel stops are needed.
    """
    print("[DSA] Executing Greedy Algorithm for Fuel optimization")
    
    # range = fuelTankCapacity * fuelEfficiency
    max_range = bike_capacity * bike_efficiency * mode_modifier
    
    # Greedy constraint = always stop before hitting 70% bounds to guarantee safety,
    # stretching it as far as possible within that bound (Greedy Choice)
    safe_limit = max_range * 0.70
    
    stops = []
    current_fuel_distance = 0
    total_travelled = 0
    
    for segment_dist in route_distances_km:
        total_travelled += segment_dist
        current_fuel_distance += segment_dist
        
        # If we exceed safe limit, take the greedy choice to refuel NOW
        if current_fuel_distance >= safe_limit:
            stops.append(total_travelled)
            current_fuel_distance = 0 # reset after refueling

    return stops
