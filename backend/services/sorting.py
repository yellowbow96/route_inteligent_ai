def quick_sort_places(places):
    """
    Sorting Algorithm implemented natively in Quick Sort fashion.
    Sorts places based on primary criteria (distance) ascending, and secondary (rating) descending.
    """
    print("[DSA] Executing Quick Sort Algorithm for Place Ranking")
    if len(places) <= 1:
        return places
        
    pivot = places[len(places) // 2]
    left = []
    middle = []
    right = []
    
    for x in places:
        # Distance primary, Rating Secondary
        if x['distance'] < pivot['distance']:
            left.append(x)
        elif x['distance'] > pivot['distance']:
            right.append(x)
        else:
            # Tie breaker: Higher rating is "less" mathematically for descending order
            if x.get('rating', 0) > pivot.get('rating', 0):
                left.append(x)
            elif x.get('rating', 0) < pivot.get('rating', 0):
                right.append(x)
            else:
                middle.append(x)
                
    return quick_sort_places(left) + middle + quick_sort_places(right)
