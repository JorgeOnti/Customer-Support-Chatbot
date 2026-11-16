using ForkAndFlame.SupportApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Data;

/// <summary>
/// Initializes the SQLite database and seeds authoritative Fork & Flame knowledge base entries.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SupportDbContext>();

        await db.Database.EnsureCreatedAsync();

        if (await db.KnowledgeEntries.AnyAsync())
        {
            return;
        }

        var now = DateTime.UtcNow;

        var entries = new List<KnowledgeEntry>
        {
            new()
            {
                Title = "Opening Hours & Weekly Schedule",
                Category = "Hours & Location",
                Content = "Fork & Flame is open seven days a week. Monday through Thursday: 11:30 AM to 10:00 PM. Friday and Saturday: 11:30 AM to 11:30 PM. Sunday: 10:00 AM to 9:00 PM (featuring Sunday Brunch from 10:00 AM to 2:30 PM, followed by dinner service from 2:30 PM to 9:00 PM). Our wood-fired kitchen takes last food orders 30 minutes before closing.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Restaurant Location & Contact Details",
                Category = "Hours & Location",
                Content = "Fork & Flame is located at 742 Ember Way, Suite 100, Downtown Austin, TX 78701, right on the corner of Ember Way and 8th Street—two blocks west of Congress Avenue. Reach our host stand at (512) 555-0194 or email guestrelations@forkandflame.com.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Signature Steaks & Wood-Fired Mains",
                Category = "Menu & Pricing",
                Content = "Our oak-fired mains include the 14 oz Wood-Fired Ribeye ($34.00) finished with roasted bone marrow butter, 8 oz Center-Cut Filet Mignon ($38.00), Cedar-Plank Wild King Salmon ($29.50), Herb-Brined Smoked Half-Chicken ($24.00), and Charred Cauliflower Steak ($21.00). Every main includes one house side: Truffle Parmesan Fries, Charred Broccolini, or Smoked Gouda Mac & Cheese ($7.00 each a la carte).",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Starters, Artisanal Pizzas & Fresh Salads",
                Category = "Menu & Pricing",
                Content = "Popular starters include Truffle Burrata ($14.50) with blistered heirloom tomatoes and wood-grilled sourdough, Wood-Roasted Bone Marrow ($16.00), and Crispy Calamari ($15.00). Wood-fired sourdough pizzas: Hot Honey Pepperoni ($18.50), Wild Mushroom & Truffle ($19.00), and Classic Margherita ($16.50). Fresh salads: Baby Gem Caesar ($13.00) and Roasted Beet & Goat Cheese ($14.00), with optional grilled chicken (+$7.00) or wood-grilled shrimp (+$9.00).",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Desserts, Craft Cocktails & Happy Hour",
                Category = "Menu & Pricing",
                Content = "House-made desserts include Molten Dark Chocolate Lava Cake ($11.00) with Madagascar vanilla bean gelato, Torched Basque Cheesecake ($10.50), and Bourbon Caramel Bread Pudding ($10.00). Signature craft cocktails: Smoked Old Fashioned ($15.00), Charred Pineapple Mezcalita ($14.50), and Cold-Brew Espresso Martini ($15.00). Happy Hour runs Monday through Friday from 4:00 PM to 6:00 PM at the bar and patio with $3.00 off all craft cocktails, $8.00 select house wines, and half-price starters.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Sunday Brunch & Bottomless Mimosas",
                Category = "Menu & Pricing",
                Content = "Sunday Brunch is served from 10:00 AM to 2:30 PM. Highlights include Wood-Fired Steak & Eggs ($24.00), Brioche French Toast ($15.50) with maple butter, Smoked Brisket Benedict ($18.50), and Avocado & Poached Egg Sourdough Toast ($14.50). Guests can add Bottomless Mimosas or House Bloody Marys for $22.00 per guest with any entree purchase (90-minute table limit).",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Delivery Zones, Fees & Minimum Order",
                Category = "Delivery",
                Content = "Fork & Flame offers direct local delivery within a 5-mile radius of 742 Ember Way. We do not deliver beyond 5 miles to protect food temperature and texture, though pickup is available for any distance. Delivery orders require a $20.00 minimum before tax and tip, carry a flat $4.99 delivery fee, and typically arrive in 35 to 50 minutes (up to 60 minutes during Friday and Saturday peak hours).",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Curbside Pickup & Takeout Packaging",
                Category = "Delivery",
                Content = "Takeout and curbside pickup orders have no order minimum and zero service fees, and are ready in 20 to 30 minutes. We reserve three 15-minute curbside pickup spaces directly in front of our 8th Street entrance—simply call (512) 555-0194 when you pull up. All hot dishes travel in vented thermal eco-containers to keep crusts crisp.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Gluten-Free Options & Celiac Protocols",
                Category = "Dietary & Allergens",
                Content = "More than 70% of the Fork & Flame menu can be prepared gluten-free, including all wood-fired steaks, Cedar-Plank Salmon, Smoked Half-Chicken, Truffle Burrata (served with gluten-free flatbread at no extra charge), and salads without croutons. Any artisanal pizza can be ordered on gluten-free crust (+$3.50). Our Truffle Parmesan Fries are cooked in a dedicated gluten-free fryer, and we use a separate sanitized prep station for celiac guests upon request.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Nut-Free Kitchen, Vegan & Vegetarian Dishes",
                Category = "Dietary & Allergens",
                Content = "Fork & Flame operates a 100% peanut-free and tree-nut-free kitchen across all dishes, sauces, and desserts. Dedicated vegan choices include the Charred Cauliflower Steak ($21.00), Vegan Marinara & Roasted Vegetable Wood-Fired Pizza ($17.50 with house dairy-free mozzarella), Charred Broccolini ($7.00), and Crispy Fingerling Potatoes ($7.00). Please notify your server of any severe food sensitivities when ordering.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Table Reservations & Walk-In Policy",
                Category = "Reservations & Policies",
                Content = "Tables for 1 to 12 guests can be booked online or by calling (512) 555-0194 up to 30 days in advance. We keep 25% of our main dining room and our entire bar lounge open for walk-in guests every evening. Reservations include a 15-minute grace period before tables are released to our waitlist.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Group Bookings, Event Room & Cancellation Policy",
                Category = "Reservations & Policies",
                Content = "Group reservations of 6 to 12 guests require a credit card on file to confirm. Reservations may be modified or canceled free of charge up to 2 hours prior to seating; cancellations within 2 hours or no-shows for parties of 6 or more incur a $15.00 per guest fee. Larger celebrations of 13 to 45 guests can reserve the Ember Event Room with family-style or 3-course group packages starting at $55.00 per person (requires 7 days advance notice via events@forkandflame.com).",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Catering Packages & Corporate Orders",
                Category = "Amenities & Services",
                Content = "We provide drop-off and full-service catering for 15 to 150 guests within 15 miles of downtown Austin. Popular packages include the Wood-Fired Grill Buffet ($28.00 per person) and the Artisanal Pizza & Salad Spread ($19.50 per person). Catering orders require at least 48 hours advance notice and a $250.00 subtotal minimum.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Parking Validation, Valet & Dog-Friendly Patio",
                Category = "Amenities & Services",
                Content = "Guests receive validated self-parking at the Ember Plaza Garage on 8th Street for $4.00 for up to 3 hours (bring your garage ticket to the host stand). Evening valet is available Thursday through Saturday starting at 5:00 PM for $12.00. Our covered, heated outdoor patio seats 40 guests and warmly welcomes well-behaved, leashed dogs with complimentary water bowls.",
                IsActive = true,
                UpdatedAt = now
            },
            new()
            {
                Title = "Gift Cards, Guest Wi-Fi & Corkage Policy",
                Category = "Amenities & Services",
                Content = "Physical and digital Fork & Flame gift cards are available in denominations from $25.00 to $500.00, never expire, and can be redeemed for dine-in, pickup, or local delivery. Complimentary high-speed Wi-Fi is available throughout the dining room and patio on network ForkAndFlame_Guest. Guests may bring up to two 750ml bottles of wine not featured on our wine list for a $25.00 corkage fee per bottle.",
                IsActive = true,
                UpdatedAt = now
            }
        };

        await db.KnowledgeEntries.AddRangeAsync(entries);
        await db.SaveChangesAsync();
    }
}
