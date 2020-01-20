using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Collections.Concurrent;
using System.Web.Caching;
using Microsoft.WindowsAzure.Storage.Table;
using System.Diagnostics;

namespace Happy2
{
	public class BlockPathsRoll
	{
		private ConcurrentQueue<PathModel> queue = new ConcurrentQueue<PathModel>();

		public BlockPathsRoll(string key)
		{
			DrawingStore.GetStoredPaths(key, entity => addPath(entity));
		}
		private void addPath(DynamicTableEntity entity)
		{
			PathModel model = new PathModel();

			model.Type = (int)entity["t"].Int32Value;
			model.UserId = entity["u"].StringValue;

			model.Layer = entity.GetInt("l", Consts.MAIN_LAYER_NUM);
			model.Zoom = entity.GetInt("z", 1);
			model.TransformMatrix = entity.GetString("tm", "1,0,0,1");
			model.Color = entity.GetString("o", "#000000");
			model.TipSize = entity.GetInt("s", 0/*default*/);
			model.BrushId = entity.GetInt("b", 0/*default*/);
			model.Blur = entity.GetInt("r", 0/*default*/);
			model.Idiosyncrasy = entity.GetString("i", "");

			//model.HeadX = (int)entity["hx"].Int32Value;
			model.HeadX = entity.GetIntOrString("hx");		// typed changed from int to string.

			//model.HeadY = (int)entity["hy"].Int32Value;
			model.HeadY = entity.GetIntOrString("hy");		// typed changed from int to string.

			model.BlockIndexX = (int)entity["bx"].Int32Value;
			model.BlockIndexY = (int)entity["by"].Int32Value;
			model.DxDyCombined = entity["c"].StringValue;
			model.Gsid = entity.GetInt("g", 0);

			this.AddPath(model);
		}
		public void AddPath(PathModel model)
		{
			this.queue.Enqueue(model);
		}
		public IEnumerable<PathModel> Get()
		{
			return queue;
		}
	}
	public class BlockPathsPond
	{
		private BlockPathsRoll insertNew(string key)
		{
			BlockPathsRoll obj = new BlockPathsRoll(key);		// if concurrency happens, this will be done more than once.

			// todo: should put empty blocks into cache for ?

			HttpRuntime.Cache.Insert(key, obj, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
											Cache.NoSlidingExpiration, CacheItemPriority.Default, removedCallback);

			// expires after some time for multi-node synchronization (unreliable).
			return obj;
		}
		private void removedCallback(string key, Object value, CacheItemRemovedReason reason)
		{
			if (reason == CacheItemRemovedReason.Expired)
			{
				BlockPathsRoll obj = (BlockPathsRoll)value;
				// insertNew(key);		// Not needed to keep it always in memory.
			}
		}
		private BlockPathsRoll get(int block_idx_x, int block_idx_y)
		{
			// be careful of name conflict from other ponds using the same cache.
			string key = Config.DRAWING_PAR_KEY_PREFIX + block_idx_x.ToString() + ',' + block_idx_y.ToString();

			BlockPathsRoll obj = (BlockPathsRoll)HttpRuntime.Cache.Get(key);

			if (obj == null)
				obj = insertNew(key);

			return obj;
		}
		public IEnumerable<PathModel> GetBlockPaths(int block_idx_x, int block_idx_y)
		{
			BlockPathsRoll roll = this.get(block_idx_x, block_idx_y);
			return roll.Get();
		}
		public int AddPath(PathModel model)
		{
			int ret = DrawingStore.AddPath(model);
			if (ret == 0 || ret == 3)
			{
				string key = Config.DRAWING_PAR_KEY_PREFIX + model.BlockIndexX.ToString() + ',' + model.BlockIndexY.ToString();
				BlockPathsRoll obj = (BlockPathsRoll)HttpRuntime.Cache.Get(key);

				if (obj != null)
					obj.AddPath(model);
			}
			return ret;
		}
	}
	public static class RoomsPond
	{
		private static RoomInfo insertNew(string key, string name)
		{
			RoomInfoEntity entity = RoomStore.GetRoom(name);		// if concurrency happens, this will be done more than once.

			if (entity != null)
			{
				RoomInfo obj = new RoomInfo(entity);

				HttpRuntime.Cache.Insert(key, obj, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
												Cache.NoSlidingExpiration, CacheItemPriority.Default, removedCallback);
				return obj;
			}
			// expires after some time for multi-node synchronization (unreliable).
			return null;
		}
		private static void removedCallback(string key, Object value, CacheItemRemovedReason reason)
		{
			if (reason == CacheItemRemovedReason.Expired)
			{
				RoomInfo obj = (RoomInfo)value;
				// insertNew(key);		// Not needed to keep it always in memory.
			}
		}
		public static RoomInfo Get(string name)
		{
			// be careful of name conflict from other ponds using the same cache.
			string key = Config.ROOM_NAME_KEY_PREFIX + name.ToLowerInvariant();

			RoomInfo obj = (RoomInfo)HttpRuntime.Cache.Get(key);

			if (obj == null)
				obj = insertNew(key, name);

			return obj;
		}
		public static void Notify(string name)
		{
			string key = Config.ROOM_NAME_KEY_PREFIX + name.ToLowerInvariant();
			RoomInfo obj = (RoomInfo)HttpRuntime.Cache.Remove(key);

			//if (obj != null)
			//	insertNew(key, name);
		}
	}
	public static class NotePond
	{
		private static string key(string room_name)
		{
			// be careful of name conflict from other ponds using the same cache.
			string key = "Notes" + Config.KEY_CONCAT + room_name.ToLowerInvariant();
			return key;
		}
		private static NoteRoll insertNew(string room_name)
		{
			NoteRoll obj = new NoteRoll(room_name);		// if concurrency happens, this will be done more than once.

			HttpRuntime.Cache.Insert(key(room_name), obj, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
											Cache.NoSlidingExpiration, CacheItemPriority.Default, removedCallback);

			// expires after some time for multi-node synchronization (unreliable).
			return obj;
		}
		private static void removedCallback(string key, Object value, CacheItemRemovedReason reason)
		{
			if (reason == CacheItemRemovedReason.Expired)
			{
				NoteRoll obj = (NoteRoll)value;
				// insertNew(key);		// Not needed to keep it always in memory.
			}
		}
		private static NoteRoll get(string room_name)
		{
			NoteRoll obj = (NoteRoll)HttpRuntime.Cache.Get(key(room_name));

			if (obj == null)
				obj = insertNew(room_name);

			return obj;
		}
		public static IEnumerable<NoteInfo> Get(string room_name)
		{
			NoteRoll roll = get(room_name);
			return roll.Get();
		}
		public static void AddNote(string room_name, NoteInfo info)
		{
			NoteStore.AddNote(room_name, info);

			NoteRoll obj = (NoteRoll)HttpRuntime.Cache.Get(key(room_name));

			if (obj != null)
				obj.AddNote(info);
		}
	}
	public static class ChatPond
	{
		private static string key(string room_name)
		{
			// be careful of name conflict from other ponds using the same cache.
			string key = "Chats" + Config.KEY_CONCAT + room_name.ToLowerInvariant();
			return key;
		}
		private static ChatRoll insertNew(string room_name)
		{
			string key2 = key(room_name);
			//Trace.TraceInformation("ChatPond.insertNew. key={0}.", key2);

			ChatRoll obj = new ChatRoll(room_name);		// if concurrency happens, this will be done more than once.

			HttpRuntime.Cache.Insert(key2, obj, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
											Cache.NoSlidingExpiration, CacheItemPriority.Default, removedCallback);

			// expires after some time for multi-node synchronization (unreliable).
			return obj;
		}
		private static void removedCallback(string key, Object value, CacheItemRemovedReason reason)
		{
			// Reason=Removed happens when an existing key is inserted again.
			//Trace.TraceInformation("ChatPond.removedCallback. key={0}, reason={1}.", key, reason);

			ChatRoll obj = (ChatRoll)value;
			obj.Save();

			if (reason == CacheItemRemovedReason.Expired)
			{
				// insertNew(key);		// Not needed to keep it always in memory.
			}
		}
		private static ChatRoll get(string room_name)
		{
			ChatRoll obj = (ChatRoll)HttpRuntime.Cache.Get(key(room_name));

			if (obj == null)
				obj = insertNew(room_name);

			return obj;
		}
		public static IEnumerable<UserWords> Get(string room_name)
		{
			// When Get and AddChat are called in different threads at very close time, both will trigger insertNew.
			// 2 rolls of the same room are inserted into cache, latter one kicks former one out of cache.
			//Trace.TraceInformation("ChatPond.Get. room_name={0}.", room_name);

			ChatRoll roll = get(room_name);
			return roll.Get();
		}
		public static void AddChat(string room_name, string speaker, string words)
		{
			//Trace.TraceInformation("ChatPond.AddChat. room_name={0}.", room_name);

			ChatRoll roll = get(room_name);
			roll.Add(speaker, words);
		}
	}
	public class TableRowPond
	{
		private CloudTable table;

		public TableRowPond(CloudTable table)
		{
			this.table = table;
		}
		private string key(string partition_key, string row_key)
		{
			string key = "tr" + Config.NAME_CONCAT + partition_key + Config.NAME_CONCAT + row_key;
			return key;
		}
		private DynamicTableEntity insertNew(string partition_key, string row_key)
		{
			TableResult result = table.Execute(TableOperation.Retrieve(partition_key, row_key));
			DynamicTableEntity obj = (DynamicTableEntity)result.Result;

			if (obj != null)
			{
				string cache_key = key(partition_key, row_key);

				HttpRuntime.Cache.Insert(cache_key, obj, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
											Cache.NoSlidingExpiration);				
			}
			return obj;
		}
		public DynamicTableEntity Get(string partition_key, string row_key)
		{
			string cache_key = key(partition_key, row_key);
			DynamicTableEntity obj = (DynamicTableEntity)HttpRuntime.Cache.Get(cache_key);

			if (obj == null)
				obj = insertNew(partition_key, row_key);

			return obj;		// The etag may have expired and cannot be used to update table.
		}
		public void Notify(string partition_key, string row_key)
		{
			string cache_key = key(partition_key, row_key);
			DynamicTableEntity obj = (DynamicTableEntity)HttpRuntime.Cache.Remove(cache_key);
		}
	}
	public interface IInitializeByEntity
	{
		void Initialize(DynamicTableEntity entity);
	}
	public class TablePartitionPond<T> where T : IInitializeByEntity, new()
	{
		private CloudTable table;

		public TablePartitionPond(CloudTable table)
		{
			this.table = table;
		}
		private string key(string partition_key)
		{
			string key = "tp" + Config.NAME_CONCAT + partition_key;
			return key;
		}
		private ConcurrentQueue<T> insertNew(string partition_key)
		{
			ConcurrentQueue<T> queue = new ConcurrentQueue<T>();

			TableQuery query = new TableQuery().Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, partition_key));

			foreach (DynamicTableEntity entity in table.ExecuteQuery(query))
			{
				T t = new T();
				t.Initialize(entity);
				queue.Enqueue(t);
			}
			string cache_key = key(partition_key);

			HttpRuntime.Cache.Insert(cache_key, queue, null, DateTime.Now.AddSeconds(Config.DEFAULT_CACHE_SECONDS),
										Cache.NoSlidingExpiration);
			return queue;
		}
		public IEnumerable<T> Get(string partition_key)
		{
			string cache_key = key(partition_key);
			ConcurrentQueue<T> obj = (ConcurrentQueue<T>)HttpRuntime.Cache.Get(cache_key);

			if (obj == null)
				obj = insertNew(partition_key);

			return obj;		// The etag may have expired and cannot be used to update table.
		}
		public void Notify(string partition_key)
		{
			string cache_key = key(partition_key);
			ConcurrentQueue<T> obj = (ConcurrentQueue<T>)HttpRuntime.Cache.Remove(cache_key);
		}
	}
}