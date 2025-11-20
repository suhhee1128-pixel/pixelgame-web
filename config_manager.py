"""
설정 관리 모듈 - 스타일 설정을 저장하고 불러오는 기능
"""

import json
import os
from typing import Dict, List, Optional
from datetime import datetime

class ConfigManager:
    def __init__(self, config_dir: str = "data/configs"):
        """설정 관리자 초기화"""
        self.config_dir = config_dir
        os.makedirs(config_dir, exist_ok=True)
        self.config_file = os.path.join(config_dir, "saved_configs.json")
        
    def save_config(self, config_name: str, config_data: Dict) -> bool:
        """설정을 저장합니다"""
        try:
            # 기존 설정들 불러오기
            configs = self.load_all_configs()
            
            # 새 설정 추가/업데이트
            configs[config_name] = {
                "name": config_name,
                "data": config_data,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # 파일에 저장
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(configs, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"설정 저장 중 오류: {e}")
            return False
    
    def load_config(self, config_name: str) -> Optional[Dict]:
        """특정 설정을 불러옵니다"""
        try:
            configs = self.load_all_configs()
            if config_name in configs:
                return configs[config_name]["data"]
            return None
        except Exception as e:
            print(f"설정 불러오기 중 오류: {e}")
            return None
    
    def load_all_configs(self) -> Dict:
        """모든 설정을 불러옵니다"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"설정 파일 읽기 중 오류: {e}")
            return {}
    
    def get_config_names(self) -> List[str]:
        """저장된 설정 이름 목록을 반환합니다"""
        configs = self.load_all_configs()
        return list(configs.keys())
    
    def delete_config(self, config_name: str) -> bool:
        """설정을 삭제합니다"""
        try:
            configs = self.load_all_configs()
            if config_name in configs:
                del configs[config_name]
                
                with open(self.config_file, 'w', encoding='utf-8') as f:
                    json.dump(configs, f, ensure_ascii=False, indent=2)
                return True
            return False
        except Exception as e:
            print(f"설정 삭제 중 오류: {e}")
            return False
    
    def get_config_info(self, config_name: str) -> Optional[Dict]:
        """설정의 메타데이터를 반환합니다"""
        try:
            configs = self.load_all_configs()
            if config_name in configs:
                return {
                    "name": configs[config_name]["name"],
                    "created_at": configs[config_name]["created_at"],
                    "updated_at": configs[config_name]["updated_at"]
                }
            return None
        except Exception as e:
            print(f"설정 정보 가져오기 중 오류: {e}")
            return None

# 전역 설정 관리자 인스턴스
_global_config_manager = None

def get_global_config_manager():
    """전역 설정 관리자 인스턴스를 반환합니다"""
    global _global_config_manager
    if _global_config_manager is None:
        _global_config_manager = ConfigManager()
    return _global_config_manager
