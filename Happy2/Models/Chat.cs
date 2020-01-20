using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Collections.Concurrent;
using Microsoft.WindowsAzure.Storage.Table;
using System.Threading;

namespace Happy2
{
	public class UserWords
	{
		public string Speaker;
		public string Words;

		public UserWords(string speaker, string words)
		{
			this.Speaker = speaker;
			this.Words = words;
		}
	}
#if OLD
	public static class ChatManager
	{
		public const int MAX_NUM_CHATS = 100;

		private static ConcurrentQueue<UserWords> wordsQueue;
		private static Timer timer;

		private static bool modified = false;

		static ChatManager()
		{
			wordsQueue = ChatStore.Read();
			timer = new Timer(onTimer, null, 3 * 60 * 1000/*ms*/, 3 * 60 * 1000/*ms*/);
		}
		public static void Add(string speaker, string words)
		{
			if (speaker.Length > 0 && words.Length > 0)
			{
				UserWords dummy;

				if (wordsQueue.Count >= MAX_NUM_CHATS)
					wordsQueue.TryDequeue(out dummy);

				wordsQueue.Enqueue(new UserWords(speaker, words));
				modified = true;
			}
		}
		public static IEnumerable<UserWords> Get(string room)
		{
			return wordsQueue;
		}
		private static void onTimer(object state)
		{
			if (modified)
			{
				modified = false;
				ChatStore.Write(wordsQueue);
			}
		}
	}
#endif
	public class ChatRoll
	{
		public const int MAX_NUM_CHATS = 100;

		private ConcurrentQueue<UserWords> wordsQueue = new ConcurrentQueue<UserWords>();
		private string roomName;
		private bool modified = false;

		public ChatRoll(string room_name)
		{
			this.roomName = room_name;

			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant();

			TableResult result = Warehouse.ChatsTable.Execute(TableOperation.Retrieve(partition_key, "Last"));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity != null)
			{
				for (int i = 0; i < MAX_NUM_CHATS; i++)
				{
					string speaker = entity.GetString("s" + i.ToString(), null);
					string words = entity.GetString("w" + i.ToString(), null);

					if (speaker != null && words != null)
						wordsQueue.Enqueue(new UserWords(speaker, words));
					else
						break;
				}
			}
		}
		public void Save()
		{
			if (modified)
			{
				modified = false;

				string partition_key = Config.ROOM_NAME_KEY_PREFIX + roomName.ToLowerInvariant();
				DynamicTableEntity entity = new DynamicTableEntity(partition_key, "Last");

				int idx = 0;
				foreach (UserWords uw in wordsQueue)
				{
					entity["s" + idx.ToString()] = new EntityProperty(uw.Speaker);
					entity["w" + idx.ToString()] = new EntityProperty(uw.Words);

					idx++;
				}
				Warehouse.ChatsTable.Execute(TableOperation.InsertOrReplace(entity));
			}
		}
		public void Add(string speaker, string words)
		{
			if (speaker.Length > 0 && words.Length > 0)
			{
				UserWords dummy;

				if (wordsQueue.Count >= MAX_NUM_CHATS)
					wordsQueue.TryDequeue(out dummy);

				wordsQueue.Enqueue(new UserWords(speaker, words));
				modified = true;
			}
		}
		public IEnumerable<UserWords> Get()
		{
			return wordsQueue;
		}
	}
#if OLD
	public static class ChatStore
	{
		public static ConcurrentQueue<UserWords> Read()
		{
			ConcurrentQueue<UserWords> queue = new ConcurrentQueue<UserWords>();

			TableResult result = Warehouse.ChatsTable.Execute(TableOperation.Retrieve("Chats", "Last"));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity != null)
			{
				for (int i = 0; i < ChatManager.MAX_NUM_CHATS; i++)
				{
					string speaker = entity.GetString("s" + i.ToString(), null);
					string words = entity.GetString("w" + i.ToString(), null);

					if (speaker != null && words != null)
						queue.Enqueue(new UserWords(speaker, words));
					else
						break;
				}
			}
			return queue;
		}
		public static void Write(IEnumerable<UserWords> list)
		{
			DynamicTableEntity entity = new DynamicTableEntity("Chats", "Last");

			int idx = 0;
			foreach (UserWords uw in list)
			{
				entity["s" + idx.ToString()] = new EntityProperty(uw.Speaker);
				entity["w" + idx.ToString()] = new EntityProperty(uw.Words);

				idx++;
			}
			Warehouse.ChatsTable.Execute(TableOperation.InsertOrReplace(entity));
		}
	}
#endif
}