using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading;

namespace Happy2
{
	public static class Limiter
	{
		private static Timer _expireTimer;
		private static Dictionary<string, Queue<DateTime>> userRates = new Dictionary<string, Queue<DateTime>>();

		static Limiter()
		{
			_expireTimer = new Timer(ExpireOldRates, null, 60 * 1000/*ms*/, 60 * 1000/*ms*/);
		}
		public static bool IsOverRate(string connection_id)
		{
			lock (userRates)
			{
				Queue<DateTime> queue;

				if (!userRates.TryGetValue(connection_id, out queue))
				{
					queue = new Queue<DateTime>();
					userRates.Add(connection_id, queue);
				}

				DateTime now = DateTime.Now;
				if (queue.Count >= 15)
				{
					DateTime oldest = queue.Peek();

					if (now < oldest.AddSeconds(4/*5*/))
						return true;

					queue.Dequeue();
				}
				queue.Enqueue(now);

				return false;
			}
		}
		private static void ExpireOldRates(object state)
		{
			lock (userRates)
			{
				List<string> to_remove_list = new List<string>();

				foreach (KeyValuePair<string, Queue<DateTime>> pair in userRates)
				{
					DateTime now = DateTime.Now;
					DateTime oldest = pair.Value.Peek();

					if (oldest.AddMinutes(10) < now)
						to_remove_list.Add(pair.Key);
				}
				foreach (string key in to_remove_list)
					userRates.Remove(key);
			}
		}
	}
}
