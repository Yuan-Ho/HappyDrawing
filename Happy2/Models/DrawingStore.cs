using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Table;

namespace Happy2
{
	public enum PathType
	{
		PT_PENCIL = 1,
		PT_ERASER = 2,
		PT_SCISSOR = 3,
		PT_TRASH = 4,
		PT_BATCH = 5,
		PT_NOTE = 6,
		PT_PICTURE = 7,
		PT_FILLER = 8,
	}
	public class DrawingInfoEntity : TableEntity
	{
		public int NextId { get; set; }

		public DrawingInfoEntity()
		{
		}
		public DrawingInfoEntity(string partition_key)
		{
			this.PartitionKey = partition_key;
			this.RowKey = Config.SPECIAL_KEY;
		}
	}
	public static class DrawingStore
	{
		public static int/*0=suc, 1=fail, 2=full, 3=suc almost full*/ AddPath(PathModel path_model)
		{
			int ret = addPath(path_model);

			if (ret == 1)
				ret = addPath(path_model);
			return ret;
		}
		public static int GetNumberOfPaths(int block_idx_x, int block_idx_y)
		{
			string partition_key = Config.DRAWING_PAR_KEY_PREFIX + block_idx_x.ToString() + ',' + block_idx_y.ToString();

			TableOperation op = TableOperation.Retrieve<DrawingInfoEntity>(partition_key, Config.SPECIAL_KEY);
			TableResult result = Warehouse.DrawingsTable.Execute(op);

			DrawingInfoEntity info_entity = (DrawingInfoEntity)result.Result;

			if (info_entity != null)
				return info_entity.NextId;
			else
				return 0;
		}
		private static int/*0=suc, 1=fail, 2=full, 3=suc almost full*/ addPath(PathModel model)
		{
			string partition_key = Config.DRAWING_PAR_KEY_PREFIX + model.BlockIndexX.ToString() + ',' + model.BlockIndexY.ToString();

			try
			{
				TableOperation op = TableOperation.Retrieve<DrawingInfoEntity>(partition_key, Config.SPECIAL_KEY);
				TableResult result = Warehouse.DrawingsTable.Execute(op);

				DrawingInfoEntity info_entity = (DrawingInfoEntity)result.Result;

				if (info_entity != null)
				{
					if (info_entity.NextId >= Config.BLOCK_FULL_THRESHOLD)
						return 2;

					info_entity.NextId++;

					Warehouse.DrawingsTable.Execute(TableOperation.Replace(info_entity));
				}
				else
				{
					info_entity = new DrawingInfoEntity(partition_key);
					info_entity.NextId++;

					Warehouse.DrawingsTable.Execute(TableOperation.Insert(info_entity));
				}

				string row_key = Config.DRAWING_ROW_KEY_PREFIX + (info_entity.NextId - 1).ToString("D" + Config.DRAWING_ROW_KEY_DIGITS);

				DynamicTableEntity entity = new DynamicTableEntity(partition_key, row_key);

				entity["t"] = new EntityProperty(model.Type);
				entity["u"] = new EntityProperty(model.UserId);
				entity["l"] = new EntityProperty(model.Layer);
				entity["z"] = new EntityProperty(model.Zoom);
				entity["tm"] = new EntityProperty(model.TransformMatrix);
				entity["o"] = new EntityProperty(model.Color);
				entity["s"] = new EntityProperty(model.TipSize);
				entity["b"] = new EntityProperty(model.BrushId);
				entity["r"] = new EntityProperty(model.Blur);

				if (model.Idiosyncrasy.Length != 0)
					entity["i"] = new EntityProperty(model.Idiosyncrasy);

				entity["hx"] = new EntityProperty(model.HeadX);		// typed changed from int to string.
				entity["hy"] = new EntityProperty(model.HeadY);		// typed changed from int to string.
				entity["bx"] = new EntityProperty(model.BlockIndexX);
				entity["by"] = new EntityProperty(model.BlockIndexY);
				entity["c"] = new EntityProperty(model.DxDyCombined);
				entity["g"] = new EntityProperty(model.Gsid);

				Warehouse.DrawingsTable.Execute(TableOperation.Insert(entity));
				//
				//HomeManager.onNewPath(model.BlockIndexX, model.BlockIndexY, info_entity.NextId);

				return info_entity.NextId >= Config.BLOCK_ALMOST_FULL ? 3 : 0;
			}
			catch (StorageException ex)
			{
				// "遠端伺服器傳回一個錯誤: (409) 衝突。" when inserting duplicated entities.
				// "遠端伺服器傳回一個錯誤: (412) Precondition Failed。" when entity is modified in between.
				return 1;
			}
		}
		public static void GetStoredPaths(string partition_key, Action<DynamicTableEntity> act)
		{
			TableQuery query = new TableQuery().Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, partition_key));

			foreach (DynamicTableEntity entity in Warehouse.DrawingsTable.ExecuteQuery(query))
			{
				if (entity.RowKey[0] != Config.SPECIAL_KEY_PREFIX)
					act(entity);
			}
		}
	}
}